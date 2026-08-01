from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Slogan
from app.schemas.schemas import SloganResponse, SloganCreate, SloganUpdate, MessageResponse

router = APIRouter(prefix="/api/slogans", tags=["slogans"])


@router.get("", response_model=list[SloganResponse])
async def list_slogans(db: Session = Depends(get_db)):
    slogans = db.query(Slogan).filter(Slogan.is_active == True).order_by(Slogan.sort_order).all()
    return slogans


@router.post("", response_model=SloganResponse)
async def create_slogan(req: SloganCreate, db: Session = Depends(get_db)):
    slogan = Slogan(**req.model_dump())
    db.add(slogan)
    db.commit()
    db.refresh(slogan)
    return slogan


@router.put("/{slogan_id}", response_model=SloganResponse)
async def update_slogan(slogan_id: int, req: SloganUpdate, db: Session = Depends(get_db)):
    slogan = db.query(Slogan).filter(Slogan.id == slogan_id).first()
    if not slogan:
        raise HTTPException(status_code=404, detail="口号不存在")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(slogan, k, v)
    db.commit()
    db.refresh(slogan)
    return slogan


@router.delete("/{slogan_id}", response_model=MessageResponse)
async def delete_slogan(slogan_id: int, db: Session = Depends(get_db)):
    slogan = db.query(Slogan).filter(Slogan.id == slogan_id).first()
    if not slogan:
        raise HTTPException(status_code=404, detail="口号不存在")
    db.delete(slogan)
    db.commit()
    return MessageResponse(message="口号已删除")
