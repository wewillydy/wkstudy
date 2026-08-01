from datetime import datetime, date
from pydantic import BaseModel, EmailStr, Field
from typing import Optional


# ======== Auth ========
class SendCodeRequest(BaseModel):
    email: EmailStr
    type: str = Field(..., pattern="^(login|register)$")


class RegisterRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=4, max_length=10)
    password: str = Field(..., min_length=6, max_length=128)
    nickname: str = Field(..., min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)
    remember_me: bool = False


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    nickname: str
    avatar: str
    is_admin: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ======== Course ========
class CoursewareResponse(BaseModel):
    id: int
    title: str
    file_url: str
    file_type: str
    sort_order: int

    class Config:
        from_attributes = True


class CourseResponse(BaseModel):
    id: int
    title: str
    description: str
    cover_url: str
    video_url: str
    duration: int
    grade: str
    subject: str
    course_type: str
    teacher_name: str
    status: str
    sort_order: int
    created_at: datetime
    courseware: list[CoursewareResponse] = []

    class Config:
        from_attributes = True


class CourseListResponse(BaseModel):
    id: int
    title: str
    description: str
    cover_url: str
    duration: int
    grade: str
    subject: str
    course_type: str
    teacher_name: str
    progress: Optional[float] = None
    is_completed: bool = False
    mark_count: int = 0

    class Config:
        from_attributes = True


class CourseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str = ""
    cover_url: str = ""
    video_url: str
    duration: int = 0
    grade: str = ""
    subject: str = ""
    course_type: str = "recorded"
    teacher_name: str = ""
    status: str = "active"
    sort_order: int = 0


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    video_url: Optional[str] = None
    duration: Optional[int] = None
    grade: Optional[str] = None
    subject: Optional[str] = None
    course_type: Optional[str] = None
    teacher_name: Optional[str] = None
    status: Optional[str] = None
    sort_order: Optional[int] = None


class UpdateProgressRequest(BaseModel):
    progress: float = Field(..., ge=0.0, le=1.0)
    watch_time: int = Field(..., ge=0)


# ======== Courseware ========
class CoursewareCreate(BaseModel):
    title: str
    file_url: str
    file_type: str = Field(..., pattern="^(pdf|docx|md)$")
    sort_order: int = 0


class CoursewareUpdate(BaseModel):
    title: Optional[str] = None
    file_url: Optional[str] = None
    file_type: Optional[str] = None
    sort_order: Optional[int] = None


# ======== Schedule ========
class ScheduleCreate(BaseModel):
    course_id: int
    schedule_date: date
    user_id: Optional[int] = None  # NULL = all users


class ScheduleResponse(BaseModel):
    id: int
    course_id: int
    user_id: Optional[int]
    schedule_date: date
    course: Optional[CourseListResponse] = None

    class Config:
        from_attributes = True


# ======== Mark ========
class MarkCreate(BaseModel):
    mark_time: float = Field(..., ge=0.0)
    mark_type: str = Field(..., pattern="^(key|doubt|custom)$")
    label: str = ""


class MarkUpdate(BaseModel):
    mark_type: Optional[str] = None
    label: Optional[str] = None


class MarkResponse(BaseModel):
    id: int
    user_id: int
    course_id: int
    mark_time: float
    mark_type: str
    label: str
    created_at: datetime

    class Config:
        from_attributes = True


# ======== Slogan ========
class SloganResponse(BaseModel):
    id: int
    text: str
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


class SloganCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    is_active: bool = True
    sort_order: int = 0


class SloganUpdate(BaseModel):
    text: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


# ======== Admin ========
class AdminUserUpdate(BaseModel):
    nickname: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class AdminStatsResponse(BaseModel):
    total_users: int
    total_courses: int
    total_schedules: int
    completed_courses: int
    active_today: int


# ======== Common ========
class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int


class MessageResponse(BaseModel):
    message: str
