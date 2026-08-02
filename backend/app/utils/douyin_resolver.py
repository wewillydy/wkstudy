# -*- coding: utf-8 -*-
"""Douyin video resolver — using douyin-downloader (aligned with douxue resolve.py)."""
import sys
import re
import os
from pathlib import Path
from urllib.parse import urlparse

# Path to douyin-downloader root (inside our own project)
DOUYIN_DL_ROOT = Path(__file__).resolve().parent.parent.parent / "douyin-downloader"
sys.path.insert(0, str(DOUYIN_DL_ROOT))

# Temporarily chdir for imports (same as douxue resolve.py, but restored immediately
# to avoid affecting the rest of the FastAPI process)
_original_cwd = os.getcwd()
os.chdir(str(DOUYIN_DL_ROOT))
try:
    from core.api_client import DouyinAPIClient
    from core.url_parser import URLParser
    from auth.cookie_manager import CookieManager
    from utils.cookie_utils import parse_cookie_header, sanitize_cookies
finally:
    os.chdir(_original_cwd)


def _extract_aweme_id(url: str) -> str | None:
    m = re.search(r"/video/(\d+)", url)
    if m:
        return m.group(1)
    m = re.search(r"modal_id=(\d+)", url)
    if m:
        return m.group(1)
    m = re.search(r"/(?:note|gallery|slides)/(\d+)", url)
    if m:
        return m.group(1)
    m = re.search(r"aweme_id=(\d+)", url)
    if m:
        return m.group(1)
    return None


def _is_watermarked(url: str) -> bool:
    hints = ("tplv-dy-water", "dy-water", "owner_watermark", "watermark_image", "watermark=1", "playwm")
    return any(h in url.lower() for h in hints)


def _extract_video_url(video: dict, client: DouyinAPIClient) -> str:
    """Ported exactly from douxue resolve.py _extract_video_url."""
    bit_rates = video.get("bit_rate")
    play_addr = {}
    if isinstance(bit_rates, list) and bit_rates:
        best = max(
            (e for e in bit_rates if isinstance(e, dict) and e.get("play_addr")),
            key=lambda e: int(e.get("bit_rate") or 0),
            default=None,
        )
        if best:
            play_addr = best.get("play_addr", {})

    if not play_addr:
        for key in ["play_addr_h264", "play_addr_265", "play_addr", "play_addr_256"]:
            addr = video.get(key)
            if isinstance(addr, dict) and addr.get("url_list"):
                play_addr = addr
                break

    if not play_addr:
        play_addr = video.get("download_addr", {})

    url_list = play_addr.get("url_list") or []
    if not url_list:
        return ""

    url_list = sorted(url_list, key=lambda u: 1 if _is_watermarked(u) else 0)

    watermarked = ""
    for candidate in url_list:
        if not isinstance(candidate, str) or not candidate:
            continue
        parsed = urlparse(candidate)

        if parsed.netloc.endswith("douyin.com"):
            if "X-Bogus=" not in candidate and "a_bogus=" not in candidate:
                try:
                    signed_url, _ = client.sign_url(candidate)
                    if not _is_watermarked(candidate):
                        return signed_url
                    if not watermarked:
                        watermarked = signed_url
                except Exception:
                    if not _is_watermarked(candidate):
                        watermarked = watermarked or candidate
                continue
            if _is_watermarked(candidate):
                watermarked = watermarked or candidate
                continue
            return candidate

        if _is_watermarked(candidate):
            watermarked = watermarked or candidate
            continue
        return candidate

    if watermarked:
        return watermarked

    uri = play_addr.get("uri") or video.get("vid") or video.get("download_addr", {}).get("uri")
    if uri:
        try:
            signed_url, _ = client.build_signed_path("/aweme/v1/play/", {
                "video_id": uri,
                "ratio": "1080p",
                "line": "0",
                "is_play_url": "1",
                "watermark": "0",
                "source": "PackSourceEnum_PUBLISH",
            })
            return signed_url
        except Exception:
            pass

    return ""


def _load_cookies(cookie_str: str | None) -> dict:
    """Load cookies for DouyinAPIClient.

    If cookie_str (from DB) is provided, parse and use it.
    Otherwise fall back to CookieManager reading .cookies.json.
    """
    if cookie_str and cookie_str.strip():
        cookies = parse_cookie_header(cookie_str)
        if cookies:
            cookies.setdefault("msToken", "")
            return sanitize_cookies(cookies)

    # Fallback: exactly same as douxue resolve.py load_cookies()
    cm = CookieManager(str(DOUYIN_DL_ROOT / ".cookies.json"))
    cookies = cm.get_cookies()
    if not cookies.get("msToken"):
        cookies["msToken"] = ""
    return sanitize_cookies(cookies)


async def resolve_douyin_url(share_url: str, cookie_str: str | None = None) -> dict:
    """Resolve a douyin share URL. Aligned with douxue resolve.py resolve()."""
    result = {"title": "", "cover_url": "", "author": "", "video_url": "", "duration": 0}

    # Step 1: Extract aweme_id
    aweme_id = _extract_aweme_id(share_url)

    if not aweme_id:
        parsed = URLParser.parse(share_url)
        if parsed:
            aweme_id = parsed.get("aweme_id")

    if not aweme_id:
        import httpx
        try:
            resp = httpx.head(share_url, follow_redirects=True, timeout=10)
            aweme_id = _extract_aweme_id(str(resp.url))
        except Exception:
            pass

    if not aweme_id:
        raise RuntimeError(f"Cannot extract video ID from: {share_url}")

    # Step 2: Load cookies
    cookies = _load_cookies(cookie_str)

    # Step 3: Call API
    async with DouyinAPIClient(cookies=cookies) as client:
        detail = await client.get_video_detail(aweme_id, suppress_error=False)

        if not detail:
            raise RuntimeError(f"get_video_detail returned empty (aweme_id={aweme_id})")

        result["title"] = detail.get("desc", "") or ""
        result["author"] = (detail.get("author") or {}).get("nickname", "") or ""

        video = detail.get("video") or {}

        cover = video.get("cover") or {}
        cover_list = cover.get("url_list") or []
        if cover_list:
            result["cover_url"] = cover_list[0]
        if not result["cover_url"]:
            origin = video.get("origin_cover") or {}
            origin_list = origin.get("url_list") or []
            if origin_list:
                result["cover_url"] = origin_list[0]

        result["duration"] = (video.get("duration") or 0) // 1000
        result["video_url"] = _extract_video_url(video, client)

    return result
