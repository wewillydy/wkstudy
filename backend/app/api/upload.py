import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse

from app.core.deps import get_current_user, get_admin_user
from app.utils.upload import save_upload
from app.schemas.schemas import MessageResponse

router = APIRouter(prefix="/api/upload", tags=["upload"])


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    subdir: str = "videos",
):
    allowed_dirs = ["videos", "courseware", "covers"]
    if subdir not in allowed_dirs:
        raise HTTPException(status_code=400, detail=f"无效的上传目录，可选: {allowed_dirs}")
    url = await save_upload(file, subdir)
    return {"url": url, "filename": file.filename}
