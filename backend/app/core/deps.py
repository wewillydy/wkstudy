from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Callable
from jose import JWTError

from app.core.database import get_db
from app.core.security import decode_token
from app.models import User

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        print("[AUTH] No credentials")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No auth header")
    try:
        payload = decode_token(credentials.credentials)
        print(f"[AUTH] decoded sub={payload.get('sub')} type={payload.get('type')}")
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Wrong token type")
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No sub")
        user_id = int(sub)
    except JWTError as e:
        print(f"[AUTH] JWT error: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Token error: {e}")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        print(f"[AUTH] User not found: id={user_id}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_role(*roles: str) -> Callable:
    """Factory: return a dependency that requires one of the given roles."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Requires role: {roles}")
        return current_user
    return role_checker


get_admin_user = require_role("super_admin")
get_course_admin = require_role("super_admin", "course_admin")


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            return None
        sub = payload.get("sub")
        if not sub:
            return None
        user_id = int(sub)
        user = db.query(User).filter(User.id == user_id).first()
        return user if user and user.is_active else None
    except JWTError:
        return None
