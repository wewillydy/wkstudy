"""Douyin video API - resolve + stream proxy (aligned with douxue architecture)"""
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User, Course
from app.schemas.schemas import DouyinResolveRequest, DouyinResolveResponse
from app.utils.douyin_resolver import resolve_douyin_url

router = APIRouter(prefix="/api/douyin", tags=["douyin"])


@router.post("/resolve", response_model=DouyinResolveResponse)
async def resolve(
    req: DouyinResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse a douyin share URL and return video info (for admin course creation)."""
    cookie = current_user.douyin_cookie if current_user.role == "course_admin" else None
    if not cookie:
        raise HTTPException(status_code=400, detail='Please configure your Douyin cookie in the "Douyin Cookie" tab')
    try:
        info = await resolve_douyin_url(req.share_url, cookie)
        return DouyinResolveResponse(**info)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Douyin resolve error: {e}")


@router.get("/stream")
async def stream(
    course_id: int = Query(...),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """Proxy a douyin video stream.
    
    Resolves the share URL stored in the course to get a fresh CDN URL,
    then proxies the video stream with proper douyin request headers.
    This is the same architecture as douxue''s /api/links/:id/stream endpoint.
    """
    # 1. Get course and share URL
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.source != "douyin":
        raise HTTPException(status_code=400, detail="Not a douyin course")

    share_url = course.video_url
    if not share_url:
        raise HTTPException(status_code=400, detail="No share URL for this course")

    # 2. Resolve share URL to get CDN video URL
    # Get cookie from course owner (course admin)
    cookie = None
    if course.owner_id:
        owner = db.query(User).filter(User.id == course.owner_id).first()
        if owner and owner.douyin_cookie:
            cookie = owner.douyin_cookie

    try:
        info = await resolve_douyin_url(share_url, cookie)
        video_url = info.get("video_url")
        if not video_url:
            raise HTTPException(status_code=500, detail="Failed to resolve video URL")
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to resolve douyin video: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Douyin stream error: {e}")

    # 3. Proxy the CDN video stream (same as douxue''s approach)
    douyin_headers = {
        "Referer": "https://www.douyin.com/",
        "Origin": "https://www.douyin.com",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
    }

    range_header = None
    if request:
        range_header = request.headers.get("range")
    if range_header:
        douyin_headers["Range"] = range_header

    client = httpx.AsyncClient(timeout=60.0, follow_redirects=True)

    async def iter_bytes():
        try:
            async with client.stream("GET", video_url, headers=douyin_headers) as resp:
                async for chunk in resp.aiter_bytes(chunk_size=256 * 1024):
                    yield chunk
        except Exception as e:
            print(f"[DOUYIN STREAM ERROR] {e}")
        finally:
            await client.aclose()

    return StreamingResponse(
        iter_bytes(),
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-cache",
        },
    )
