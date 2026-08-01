from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models import Schedule, Course
from app.schemas.schemas import ScheduleCreate, ScheduleResponse, MessageResponse

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


@router.post("", response_model=ScheduleResponse)
async def create_schedule(req: ScheduleCreate, db: Session = Depends(get_db)):
    schedule = Schedule(**req.model_dump())
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    schedule.course = db.query(Course).filter(Course.id == schedule.course_id).first()
    return schedule


@router.get("", response_model=list[ScheduleResponse])
async def list_schedules(
    schedule_date: date | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Schedule).options(joinedload(Schedule.course))
    if schedule_date:
        q = q.filter(Schedule.schedule_date == schedule_date)
    schedules = q.order_by(Schedule.schedule_date.desc()).all()
    return schedules


@router.delete("/{schedule_id}", response_model=MessageResponse)
async def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="排课记录不存在")
    db.delete(schedule)
    db.commit()
    return MessageResponse(message="排课已删除")
