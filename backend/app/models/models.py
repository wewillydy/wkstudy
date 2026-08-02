from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Date, Boolean,
    Float, ForeignKey, Index
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    nickname = Column(String(100), nullable=False)
    avatar = Column(String(500), default="")
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="student")  # student / course_admin / super_admin
    douyin_cookie = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    marks = relationship("Mark", back_populates="user")
    user_courses = relationship("UserCourse", back_populates="user")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    bindings_as_admin = relationship("UserBinding", back_populates="admin",
                                     foreign_keys="UserBinding.course_admin_id", cascade="all, delete-orphan")


class EmailCode(Base):
    __tablename__ = "email_codes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False, index=True)
    code = Column(String(10), nullable=False)
    type = Column(String(20), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)

    __table_args__ = (Index("ix_email_codes_email_type", "email", "type"),)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(500), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="refresh_tokens")


class UserBinding(Base):
    __tablename__ = "user_bindings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.now)

    admin = relationship("User", back_populates="bindings_as_admin", foreign_keys=[course_admin_id])
    student = relationship("User", foreign_keys=[student_id])

    __table_args__ = (Index("ix_binding_admin_student", "course_admin_id", "student_id", unique=True),)


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, default="")
    cover_url = Column(String(1000), default="")
    video_url = Column(String(1000), nullable=False)
    duration = Column(Integer, default=0)
    grade = Column(String(50), default="")
    subject = Column(String(50), default="")
    course_type = Column(String(50), default="recorded")
    teacher_name = Column(String(200), default="")
    status = Column(String(20), default="active")
    sort_order = Column(Integer, default=0)
    source = Column(String(20), default="direct")  # direct / douyin
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    courseware = relationship("Courseware", back_populates="course", cascade="all, delete-orphan")
    marks = relationship("Mark", back_populates="course")
    schedules = relationship("Schedule", back_populates="course", cascade="all, delete-orphan")
    user_courses = relationship("UserCourse", back_populates="course")
    owner = relationship("User", foreign_keys=[owner_id])

    __table_args__ = (
        Index("ix_courses_grade", "grade"),
        Index("ix_courses_subject", "subject"),
        Index("ix_courses_status", "status"),
        Index("ix_courses_owner", "owner_id"),
    )


class Courseware(Base):
    __tablename__ = "courseware"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String(500), nullable=False)
    file_url = Column(String(1000), nullable=False)
    file_type = Column(String(20), nullable=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)

    course = relationship("Course", back_populates="courseware")


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    schedule_date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.now)

    course = relationship("Course", back_populates="schedules")


class UserCourse(Base):
    __tablename__ = "user_courses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    progress = Column(Float, default=0.0)
    watch_time = Column(Integer, default=0)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    user = relationship("User", back_populates="user_courses")
    course = relationship("Course", back_populates="user_courses")

    __table_args__ = (Index("ix_user_courses_user_course", "user_id", "course_id", unique=True),)


class Mark(Base):
    __tablename__ = "marks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    mark_time = Column(Float, nullable=False)
    mark_type = Column(String(20), nullable=False)
    label = Column(String(500), default="")
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="marks")
    course = relationship("Course", back_populates="marks")

    __table_args__ = (Index("ix_marks_user_course", "user_id", "course_id"),)


class Slogan(Base):
    __tablename__ = "slogans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    text = Column(String(500), nullable=False)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)
