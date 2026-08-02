from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.deps import get_admin_user, get_course_admin, get_current_user
from app.models import User, UserCourse, Course, Schedule, UserBinding
from app.schemas.schemas import (
    UserResponse, AdminUserUpdate, AdminStatsResponse,
    PaginatedResponse, MessageResponse,
    BindingCreate, BindingResponse, DouyinCookieUpdate,
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
        total_pages=ceil(total / page_size) if page_size > 0 else 0,
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
        raise HTTPException(status_code=404, detail="User not found")
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


# ======== Bindings (course_admin) ========
@router.get("/bindings", response_model=list[BindingResponse])
async def list_bindings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_course_admin),
):
    bindings = db.query(UserBinding).filter(
        UserBinding.course_admin_id == current_user.id,
    ).all()
    result = []
    for b in bindings:
        student = db.query(User).filter(User.id == b.student_id).first()
        result.append(BindingResponse(
            id=b.id,
            course_admin_id=b.course_admin_id,
            student_id=b.student_id,
            student_email=student.email if student else "",
            student_nickname=student.nickname if student else "",
            created_at=b.created_at,
        ))
    return result


@router.post("/bindings", response_model=BindingResponse)
async def create_binding(
    req: BindingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_course_admin),
):
    student = db.query(User).filter(User.email == req.student_email).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.role != "student":
        raise HTTPException(status_code=400, detail="User is not a student")

    existing = db.query(UserBinding).filter(
        UserBinding.course_admin_id == current_user.id,
        UserBinding.student_id == student.id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already bound")

    binding = UserBinding(course_admin_id=current_user.id, student_id=student.id)
    db.add(binding)
    db.commit()
    db.refresh(binding)
    return BindingResponse(
        id=binding.id,
        course_admin_id=binding.course_admin_id,
        student_id=binding.student_id,
        student_email=student.email,
        student_nickname=student.nickname,
        created_at=binding.created_at,
    )


@router.delete("/bindings/{binding_id}", response_model=MessageResponse)
async def delete_binding(
    binding_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_course_admin),
):
    binding = db.query(UserBinding).filter(
        UserBinding.id == binding_id,
        UserBinding.course_admin_id == current_user.id,
    ).first()
    if not binding:
        raise HTTPException(status_code=404, detail="Binding not found")
    db.delete(binding)
    db.commit()
    return MessageResponse(message="Binding removed")


# ======== Douyin Cookie ========
@router.put("/douyin-cookie", response_model=MessageResponse)
async def update_douyin_cookie(
    req: DouyinCookieUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_course_admin),
):
    # Validate required cookie fields
    required = ["odin_tt", "passport_csrf_token"]
    missing = [k for k in required if k + "=" not in req.cookie]
    if missing:
        raise HTTPException(status_code=400, detail=f"Cookie缺少关键字段: {missing}。请从浏览器完整复制（需含odin_tt、passport_csrf_token等）")
    current_user.douyin_cookie = req.cookie
    db.commit()
    return MessageResponse(message="Cookie已保存，验证通过")


@router.get("/douyin-cookie")
async def get_douyin_cookie(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_course_admin),
):
    return {"cookie": current_user.douyin_cookie or ""}


# ======== Course Admin: My Students ========
@router.get("/my-students", response_model=list[UserResponse])
async def my_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_course_admin),
):
    bindings = db.query(UserBinding).filter(
        UserBinding.course_admin_id == current_user.id,
    ).all()
    student_ids = [b.student_id for b in bindings]
    if not student_ids:
        return []
    students = db.query(User).filter(User.id.in_(student_ids)).all()
    return [UserResponse.model_validate(s) for s in students]

