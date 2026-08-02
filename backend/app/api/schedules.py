from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user, get_course_admin
from app.models import User, Schedule, Course
from app.schemas.schemas import ScheduleCreate, ScheduleResponse, MessageResponse

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


@router.post("", response_model=ScheduleResponse)
async def create_schedule(
    req: ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_course_admin),
):
    schedule_data = req.model_dump()
    schedule = Schedule(**schedule_data)
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    schedule.course = db.query(Course).filter(Course.id == schedule.course_id).first()
    return schedule


@router.get("", response_model=list[ScheduleResponse])
async def list_schedules(
    schedule_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Schedule).options(joinedload(Schedule.course))
    if schedule_date:
        q = q.filter(Schedule.schedule_date == schedule_date)

    # Non-admin users see: global schedules (user_id=None) + own schedules
    if current_user.role not in ("super_admin", "course_admin"):
        q = q.filter(
            (Schedule.user_id == None) | (Schedule.user_id == current_user.id)
        )
    # Course admin sees: global + schedules they created for bound students
    elif current_user.role == "course_admin":
        q = q.filter(
            (Schedule.user_id == None) | (Schedule.user_id == current_user.id)
        )

    schedules = q.order_by(Schedule.schedule_date.desc()).all()
    return schedules


@router.delete("/{schedule_id}", response_model=MessageResponse)
async def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_course_admin),
):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(schedule)
    db.commit()
    return MessageResponse(message="Schedule deleted")
