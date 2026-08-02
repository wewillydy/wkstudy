from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User, Mark
from app.schemas.schemas import MarkCreate, MarkUpdate, MarkResponse, MessageResponse

router = APIRouter(prefix="/api/courses/{course_id}/marks", tags=["marks"])


@router.get("", response_model=list[MarkResponse])
async def get_marks(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    marks = db.query(Mark).filter(
        Mark.user_id == current_user.id,
        Mark.course_id == course_id,
    ).order_by(Mark.mark_time).all()
    return marks


@router.post("", response_model=MarkResponse)
async def create_mark(
    course_id: int,
    req: MarkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mark = Mark(
        user_id=current_user.id,
        course_id=course_id,
        mark_time=req.mark_time,
        mark_type=req.mark_type,
        label=req.label,
    )
    db.add(mark)
    db.commit()
    db.refresh(mark)
    return mark


@router.put("/{mark_id}", response_model=MarkResponse)
async def update_mark(
    course_id: int,
    mark_id: int,
    req: MarkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mark = db.query(Mark).filter(
        Mark.id == mark_id,
        Mark.user_id == current_user.id,
        Mark.course_id == course_id,
    ).first()
    if not mark:
        raise HTTPException(status_code=404, detail="Mark not found")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(mark, k, v)
    db.commit()
    db.refresh(mark)
    return mark


@router.delete("/{mark_id}", response_model=MessageResponse)
async def delete_mark(
    course_id: int,
    mark_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mark = db.query(Mark).filter(
        Mark.id == mark_id,
        Mark.user_id == current_user.id,
        Mark.course_id == course_id,
    ).first()
    if not mark:
        raise HTTPException(status_code=404, detail="Mark not found")
    db.delete(mark)
    db.commit()
    return MessageResponse(message="Mark deleted")
