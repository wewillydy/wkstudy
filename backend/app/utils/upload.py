import os
import aiofiles
from app.core.config import get_settings

settings = get_settings()


async def save_upload(file, subdir: str) -> str:
    os.makedirs(os.path.join(settings.UPLOAD_DIR, subdir), exist_ok=True)
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    filename = f"{int(__import__('time').time() * 1000)}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, subdir, filename)
    async with aiofiles.open(filepath, "wb") as f:
        content = await file.read()
        await f.write(content)
    return f"/uploads/{subdir}/{filename}"
