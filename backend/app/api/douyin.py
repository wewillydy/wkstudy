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
    """Parse a douyin share URL and return video info (for admin course creation).

    Cookie priority: user''s douyin_cookie from DB > .cookies.json fallback.
    This is best-effort (same as douxue) -- failure to resolve does not prevent saving.
    """
    share_url = req.share_url
    cookie = current_user.douyin_cookie.strip() if current_user.douyin_cookie else None
    print(f"[DOUYIN RESOLVE] user={current_user.email} role={current_user.role} has_cookie={bool(cookie)} url={share_url[:60]}...")
    try:
        info = await resolve_douyin_url(share_url, cookie)
        print(f"[DOUYIN RESOLVE] success: title={info.get('title','')[:30]} video_url={'yes' if info.get('video_url') else 'no'}")
        return DouyinResolveResponse(**info)
    except RuntimeError as e:
        print(f"[DOUYIN RESOLVE] RuntimeError: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[DOUYIN RESOLVE] Exception: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Douyin resolve error: {e}")


@router.get("/stream")
async def stream(
    course_id: int = Query(...),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """Proxy a douyin video stream."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.source != "douyin":
        raise HTTPException(status_code=400, detail="Not a douyin course")

    share_url = course.video_url
    if not share_url:
        raise HTTPException(status_code=400, detail="No share URL for this course")

    cookie = None
    if course.owner_id:
        owner = db.query(User).filter(User.id == course.owner_id).first()
        if owner and owner.douyin_cookie:
            cookie = owner.douyin_cookie

    print(f"[DOUYIN STREAM] course_id={course_id} owner_cookie={'yes' if cookie else 'no (using .cookies.json)'} url={share_url[:60]}...")
    try:
        info = await resolve_douyin_url(share_url, cookie)
        video_url = info.get("video_url")
        if not video_url:
            print(f"[DOUYIN STREAM] video_url is empty!")
            raise HTTPException(status_code=500, detail="Failed to resolve video URL")
        print(f"[DOUYIN STREAM] resolved OK, proxying stream...")
    except HTTPException:
        raise
    except RuntimeError as e:
        print(f"[DOUYIN STREAM] RuntimeError: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to resolve douyin video: {e}")
    except Exception as e:
        print(f"[DOUYIN STREAM] Exception: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Douyin stream error: {e}")

    douyin_headers = {
        "Referer": "https://www.douyin.com/",
        "Origin": "https://www.douyin.com",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
    }

    range_header = request.headers.get("range") if request else None
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
        headers={"Accept-Ranges": "bytes", "Cache-Control": "no-cache"},
    )
