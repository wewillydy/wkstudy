"""Seed initial data: default slogans and admin user"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.models import Slogan, User
from app.core.security import hash_password

Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Default slogans
slogans = [
    "名师作伴，顶峰相见",
    "名师带路，超越无数",
    "名师辅佐，优势在我",
    "名师在手，班里我有",
]
for i, text in enumerate(slogans):
    existing = db.query(Slogan).filter(Slogan.text == text).first()
    if not existing:
        db.add(Slogan(text=text, is_active=True, sort_order=i))

# Default admin user
admin = db.query(User).filter(User.email == "admin@example.com").first()
if not admin:
    db.add(User(
        email="admin@example.com",
        nickname="管理员",
        password_hash=hash_password("admin123"),
        is_admin=True,
    ))

db.commit()
db.close()
print("Seed data created successfully!")
print("Admin: admin@example.com / admin123")
print("Slogans:", slogans)
