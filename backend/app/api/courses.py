from datetime import date, datetime
from math import ceil
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.core.database import get_db
from app.core.deps import get_current_user, get_course_admin
from app.models import User, Course, Courseware, Schedule, UserCourse, Mark
from app.schemas.schemas import (
    CourseResponse, CourseListResponse, CourseCreate, CourseUpdate,
    CoursewareResponse, CoursewareCreate, CoursewareUpdate,
    UpdateProgressRequest, PaginatedResponse, MessageResponse,
)

router = APIRouter(prefix="/api/courses", tags=["courses"])


# ---- Course CRUD (Admin) ----
@router.post("", response_model=CourseResponse)
async def create_course(
    req: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_course_admin),
):
    course = Course(**req.model_dump())
    # Set owner: super_admin courses get owner_id=None, course_admin get their own id
    if current_user.role == "course_admin":
        course.owner_id = current_user.id
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("", response_model=PaginatedResponse)
async def list_courses(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=200),
    grade: str = Query(""),
    subject: str = Query(""),
    keyword: str = Query(""),
    owned: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Course).filter(Course.status == "active")
    if grade:
        q = q.filter(Course.grade == grade)
    if subject:
        q = q.filter(Course.subject == subject)
    if keyword:
        q = q.filter(Course.title.contains(keyword))
    if owned:
        q = q.filter(Course.owner_id == current_user.id)

    total = q.count()
    courses = q.order_by(Course.sort_order.desc(), Course.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    # Attach user progress
    items = []
    for c in courses:
        uc = db.query(UserCourse).filter(
            UserCourse.user_id == current_user.id,
            UserCourse.course_id == c.id,
        ).first()
        mark_count = db.query(func.count(Mark.id)).filter(
            Mark.user_id == current_user.id,
            Mark.course_id == c.id,
        ).scalar() or 0
        items.append(CourseListResponse(
            id=c.id, title=c.title, description=c.description or "",
            cover_url=c.cover_url or "", duration=c.duration or 0,
            grade=c.grade or "", subject=c.subject or "",
            course_type=c.course_type or "recorded",
            teacher_name=c.teacher_name or "",
            source=c.source or "direct",
            progress=uc.progress if uc else None,
            is_completed=uc.is_completed if uc else False,
            mark_count=mark_count,
        ))

    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        total_pages=ceil(total / page_size) if page_size > 0 else 0,
    )


@router.get("/today", response_model=list[CourseListResponse])
async def today_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    schedules = db.query(Schedule).filter(
        Schedule.schedule_date == today,
        (Schedule.user_id == None) | (Schedule.user_id == current_user.id),
    ).all()

    course_ids = [s.course_id for s in schedules]
    if not course_ids:
        return []

    courses = db.query(Course).filter(
        Course.id.in_(course_ids),
        Course.status == "active",
    ).all()

    items = []
    for c in courses:
        uc = db.query(UserCourse).filter(
            UserCourse.user_id == current_user.id,
            UserCourse.course_id == c.id,
        ).first()
        mark_count = db.query(func.count(Mark.id)).filter(
            Mark.user_id == current_user.id,
            Mark.course_id == c.id,
        ).scalar() or 0
        items.append(CourseListResponse(
            id=c.id, title=c.title, description=c.description or "",
            cover_url=c.cover_url or "", duration=c.duration or 0,
            grade=c.grade or "", subject=c.subject or "",
            course_type=c.course_type or "recorded",
            teacher_name=c.teacher_name or "",
            source=c.source or "direct",
            progress=uc.progress if uc else None,
            is_completed=uc.is_completed if uc else False,
            mark_count=mark_count,
        ))
    return items


@router.get("/completed", response_model=list[CourseListResponse])
async def completed_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ucs = db.query(UserCourse).filter(
        UserCourse.user_id == current_user.id,
        UserCourse.is_completed == True,
    ).order_by(UserCourse.completed_at.desc()).all()

    if not ucs:
        return []

    course_ids = [uc.course_id for uc in ucs]
    courses = {c.id: c for c in db.query(Course).filter(Course.id.in_(course_ids)).all()}

    items = []
    for uc in ucs:
        c = courses.get(uc.course_id)
        if not c:
            continue
        mark_count = db.query(func.count(Mark.id)).filter(
            Mark.user_id == current_user.id, Mark.course_id == c.id,
        ).scalar() or 0
        items.append(CourseListResponse(
            id=c.id, title=c.title, description=c.description or "",
            cover_url=c.cover_url or "", duration=c.duration or 0,
            grade=c.grade or "", subject=c.subject or "",
            course_type=c.course_type or "recorded",
            teacher_name=c.teacher_name or "",
            source=c.source or "direct",
            progress=uc.progress, is_completed=True, mark_count=mark_count,
        ))
    return items


@router.get("/filters")
async def course_filters(db: Session = Depends(get_db)):
    grades = [r[0] for r in db.query(Course.grade).filter(Course.grade != "").distinct().all()]
    subjects = [r[0] for r in db.query(Course.subject).filter(Course.subject != "").distinct().all()]
    return {"grades": sorted(grades), "subjects": sorted(subjects)}


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = db.query(Course).options(joinedload(Course.courseware)).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: int,
    req: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_course_admin),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    # Course admin can only edit own courses
    if current_user.role == "course_admin" and course.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your course")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(course, k, v)
    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}", response_model=MessageResponse)
async def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_course_admin),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if current_user.role == "course_admin" and course.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your course")
    db.delete(course)
    db.commit()
    return MessageResponse(message="Course deleted")


# ---- Progress ----
@router.put("/{course_id}/progress", response_model=MessageResponse)
async def update_progress(
    course_id: int,
    req: UpdateProgressRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    uc = db.query(UserCourse).filter(
        UserCourse.user_id == current_user.id,
        UserCourse.course_id == course_id,
    ).first()

    if not uc:
        uc = UserCourse(user_id=current_user.id, course_id=course_id)
        db.add(uc)

    uc.progress = max(uc.progress or 0, req.progress)
    uc.watch_time = max(uc.watch_time or 0, req.watch_time)

    # Mark completed if >= 90%
    if uc.progress >= 0.9 and not uc.is_completed:
        uc.is_completed = True
        uc.completed_at = datetime.now()

    db.commit()
    return MessageResponse(message="Progress updated")


# ---- Courseware ----
@router.post("/{course_id}/courseware", response_model=CoursewareResponse)
async def add_courseware(course_id: int, req: CoursewareCreate, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    cw = Courseware(course_id=course_id, **req.model_dump())
    db.add(cw)
    db.commit()
    db.refresh(cw)
    return cw


@router.delete("/{course_id}/courseware/{cw_id}", response_model=MessageResponse)
async def delete_courseware(course_id: int, cw_id: int, db: Session = Depends(get_db)):
    cw = db.query(Courseware).filter(Courseware.id == cw_id, Courseware.course_id == course_id).first()
    if not cw:
        raise HTTPException(status_code=404, detail="Courseware not found")
    db.delete(cw)
    db.commit()
    return MessageResponse(message="Courseware deleted")
