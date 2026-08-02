from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import get_settings
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.deps import get_current_user
from app.models import User, EmailCode, RefreshToken
from app.schemas.schemas import (
    SendCodeRequest, RegisterRequest, LoginRequest, RefreshRequest,
    TokenResponse, UserResponse,
)
from app.utils.email import generate_code

settings = get_settings()
router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/send-code")
async def send_code(req: SendCodeRequest, db: Session = Depends(get_db)):
    print(f"[SEND-CODE] START email={req.email} type={req.type}")
    recent = db.query(EmailCode).filter(
        EmailCode.email == req.email,
        EmailCode.type == req.type,
        EmailCode.created_at > datetime.now() - timedelta(seconds=settings.EMAIL_CODE_RATE_LIMIT_SECONDS),
    ).first()
    if recent:
        raise HTTPException(status_code=429, detail="Send too frequently")

    user = db.query(User).filter(User.email == req.email).first()
    if req.type == "login" and not user:
        raise HTTPException(status_code=404, detail="Email not registered")
    if req.type == "register" and user:
        raise HTTPException(status_code=409, detail="Email already registered")

    code = generate_code()
    expires_at = datetime.now() + timedelta(minutes=settings.EMAIL_CODE_EXPIRE_MINUTES)
    email_code = EmailCode(email=req.email, code=code, type=req.type, expires_at=expires_at)
    db.add(email_code)
    db.commit()

    print(f"[DEV] Code for {req.email}: {code}")
    print(f"[SEND-CODE] DONE email={req.email}")
    return {"message": "Code sent", "dev_code": code}


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    code_record = db.query(EmailCode).filter(
        EmailCode.email == req.email,
        EmailCode.code == req.code,
        EmailCode.type == "register",
        EmailCode.used == False,
        EmailCode.expires_at > datetime.now(),
    ).order_by(EmailCode.created_at.desc()).first()

    if not code_record:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    code_record.used = True
    user = User(
        email=req.email,
        nickname=req.nickname,
        password_hash=hash_password(req.password),
        role=req.role,
    )
    db.add(user)
    db.flush()

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token_str = create_refresh_token(data={"sub": str(user.id)})
    rt = RefreshToken(
        user_id=user.id,
        token=refresh_token_str,
        expires_at=datetime.now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)
    db.commit()

    return TokenResponse(access_token=access_token, refresh_token=refresh_token_str)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=403, detail="Account not found or disabled")

    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect password")

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token_str = create_refresh_token(data={"sub": str(user.id)})

    if req.remember_me:
        rt = RefreshToken(
            user_id=user.id,
            token=refresh_token_str,
            expires_at=datetime.now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        db.add(rt)

    db.commit()
    return TokenResponse(access_token=access_token, refresh_token=refresh_token_str)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(req: RefreshRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_token(req.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        user_id: int = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Refresh token expired or invalid")

    stored = db.query(RefreshToken).filter(
        RefreshToken.token == req.refresh_token,
        RefreshToken.revoked == False,
        RefreshToken.expires_at > datetime.now(),
    ).first()

    if not stored:
        raise HTTPException(status_code=401, detail="Refresh token revoked")

    stored.revoked = True
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    new_access = create_access_token(data={"sub": str(user.id)})
    new_refresh = create_refresh_token(data={"sub": str(user.id)})

    new_rt = RefreshToken(
        user_id=user.id,
        token=new_refresh,
        expires_at=datetime.now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_rt)
    db.commit()

    return TokenResponse(access_token=new_access, refresh_token=new_refresh)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


