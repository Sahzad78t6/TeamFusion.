import asyncio
import os
import logging
import traceback
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List
import httpx

import yt_dlp

logger = logging.getLogger("growthos.youtube_search")

def _format_duration(seconds: Any) -> str:
    if not isinstance(seconds, (int, float)) or seconds <= 0:
        return "10:00"
    seconds = int(seconds)
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"

def _search_via_ytdlp(query: str, max_results: int = 6) -> List[Dict[str, Any]]:
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": "in_playlist",
        "ignoreerrors": True,
        "geo_bypass": True,
        "source_address": "0.0.0.0",  # forces IPv4
        "http_headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
    }


    results: List[Dict[str, Any]] = []
    if any(w in query.lower() for w in ["tutorial", "course", "lecture", "explained"]):
        search_query = f"ytsearch{max_results}:{query}"
    else:
        search_query = f"ytsearch{max_results}:{query} full course tutorial"

    logger.info(f"[VideoSearch] query='{query}' search_query='{search_query}'")

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(search_query, download=False)
            if not info:
                return []

            entries = info.get("entries", [])
            for entry in entries:
                if not entry or not isinstance(entry, dict):
                    continue
                v_id = entry.get("id")
                if not v_id:
                    continue

                title = entry.get("title") or f"{query.title()} Tutorial"
                channel = entry.get("uploader") or entry.get("channel") or "YouTube Channel"
                thumbnail = entry.get("thumbnail") or f"https://img.youtube.com/vi/{v_id}/hqdefault.jpg"
                duration = _format_duration(entry.get("duration"))
                video_url = f"https://www.youtube.com/watch?v={v_id}"

                results.append({
                    "video_id": str(v_id),
                    "title": str(title),
                    "channel": str(channel),
                    "thumbnail": str(thumbnail),
                    "duration_formatted": duration,
                    "url": video_url,
                })
    except Exception as e:
        logger.error(f"yt-dlp search failed for query '{query}': {type(e).__name__}: {e}")
        logger.error(traceback.format_exc())
        return []

    return results

def _search_via_data_api(query: str, max_results: int = 6) -> List[Dict[str, Any]]:
    api_key = os.getenv("YOUTUBE_API_KEY", "").strip()
    if not api_key:
        logger.warning("YOUTUBE_API_KEY not configured in environment, skipping YouTube Data API fallback.")
        return []

    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "part": "snippet",
        "type": "video",
        "maxResults": max_results,
        "q": f"{query} tutorial",
        "key": api_key,
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url, params=params)
            if resp.status_code != 200:
                logger.warning(f"YouTube Data API error {resp.status_code}: {resp.text}")
                return []
            
            data = resp.json()
            items = data.get("items", [])
            results: List[Dict[str, Any]] = []
            
            for item in items:
                v_id = item.get("id", {}).get("videoId")
                if not v_id:
                    continue
                snippet = item.get("snippet", {})
                title = snippet.get("title") or f"{query.title()} Tutorial"
                channel = snippet.get("channelTitle") or "YouTube Channel"
                thumbnails = snippet.get("thumbnails", {})
                thumb_url = thumbnails.get("high", {}).get("url") or thumbnails.get("medium", {}).get("url") or f"https://img.youtube.com/vi/{v_id}/hqdefault.jpg"

                results.append({
                    "video_id": str(v_id),
                    "title": str(title),
                    "channel": str(channel),
                    "thumbnail": str(thumb_url),
                    "duration_formatted": "12:30",
                    "url": f"https://www.youtube.com/watch?v={v_id}",
                })
            
            logger.info(f"Retrieved {len(results)} videos via YouTube Data API for query '{query}'")
            return results
    except Exception as exc:
        logger.error(f"YouTube Data API request failed for query '{query}': {type(exc).__name__}: {exc}")
        logger.error(traceback.format_exc())
        return []

def _fallback_curated_videos(query: str) -> List[Dict[str, Any]]:
    # High-quality fallback curated tutorials if both yt-dlp & Data API fail
    curated = [
        {
            "video_id": "kqtD5dpn9C8",
            "title": f"Complete {query.title()} Course for Beginners",
            "channel": "Programming with Mosh",
            "thumbnail": "https://img.youtube.com/vi/kqtD5dpn9C8/hqdefault.jpg",
            "duration_formatted": "1:00:06",
            "url": "https://www.youtube.com/watch?v=kqtD5dpn9C8",
        },
        {
            "video_id": "8jLOx1hD3_o",
            "title": f"{query.title()} Full Tutorial & Deep Dive",
            "channel": "freeCodeCamp.org",
            "thumbnail": "https://img.youtube.com/vi/8jLOx1hD3_o/hqdefault.jpg",
            "duration_formatted": "4:15:20",
            "url": "https://www.youtube.com/watch?v=8jLOx1hD3_o",
        },
        {
            "video_id": "rfscVS0vtbw",
            "title": f"Learn {query.title()} in 100 Seconds",
            "channel": "Fireship",
            "thumbnail": "https://img.youtube.com/vi/rfscVS0vtbw/hqdefault.jpg",
            "duration_formatted": "02:15",
            "url": "https://www.youtube.com/watch?v=rfscVS0vtbw",
        },
        {
            "video_id": "_uQrJ0TkZlc",
            "title": f"Mastering {query.title()} - Practical Guide",
            "channel": "Programming with Mosh",
            "thumbnail": "https://img.youtube.com/vi/_uQrJ0TkZlc/hqdefault.jpg",
            "duration_formatted": "6:14:07",
            "url": "https://www.youtube.com/watch?v=_uQrJ0TkZlc",
        },
    ]
    return curated

def _search_videos_sync(query: str, max_results: int = 6) -> List[Dict[str, Any]]:
    # 1. Primary path: yt-dlp
    results = _search_via_ytdlp(query, max_results)
    if results:
        return results

    # 2. Secondary path: YouTube Data API v3 fallback
    logger.warning(f"yt-dlp returned no results for query '{query}', falling back to YouTube Data API")
    api_results = _search_via_data_api(query, max_results)
    if api_results:
        return api_results

    # 3. Tertiary path: Curated fallback
    logger.warning(f"Both yt-dlp and YouTube Data API returned no results for '{query}', using curated fallback")
    return _fallback_curated_videos(query)

async def search_videos(query: str, max_results: int = 6, timeout_sec: float = 35.0) -> List[Dict[str, Any]]:
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_search_videos_sync, query, max_results),
            timeout=timeout_sec
        )
    except Exception as exc:
        logger.error(f"YouTube search timed out or failed for query '{query}': {exc}")
        return _fallback_curated_videos(query)
