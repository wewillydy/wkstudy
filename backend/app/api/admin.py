from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.deps import get_admin_user
from app.models import User, UserCourse, Course, Schedule
from app.schemas.schemas import (
    UserResponse, AdminUserUpdate, AdminStatsResponse,
    PaginatedResponse, MessageResponse,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStatsResponse)
async def get_stats(db: Session = Depends(get_db), _: User = Depends(get_admin_user)):
    today = date.today()
    total_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    total_courses = db.query(func.count(Course.id)).filter(Course.status == "active").scalar() or 0
    total_schedules = db.query(func.count(Schedule.id)).filter(Schedule.schedule_date >= today).scalar() or 0
    completed = db.query(func.count(UserCourse.id)).filter(UserCourse.is_completed == True).scalar() or 0
    return AdminStatsResponse(
        total_users=total_users,
        total_courses=total_courses,
        total_schedules=total_schedules,
        completed_courses=completed,
        active_today=0,
    )


@router.get("/users", response_model=PaginatedResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    keyword: str = Query(""),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    from math import ceil
    q = db.query(User)
    if keyword:
        q = q.filter(User.email.contains(keyword) | User.nickname.contains(keyword))
    total = q.count()
    users = q.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total, page=page, page_size=page_size,
        total_pages=ceil(total / page_size),
    )


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    req: AdminUserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return user


@router.get("/users/{user_id}/courses")
async def get_user_courses(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    ucs = db.query(UserCourse).filter(UserCourse.user_id == user_id).all()
    return [
        {
            "course_id": uc.course_id,
            "progress": uc.progress,
            "is_completed": uc.is_completed,
            "completed_at": uc.completed_at,
        }
        for uc in ucs
    ]
