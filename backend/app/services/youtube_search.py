import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List

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

def _search_videos_sync(query: str, max_results: int = 6) -> List[Dict[str, Any]]:
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": "in_playlist",
        "ignoreerrors": True,
    }

    results: List[Dict[str, Any]] = []
    search_query = f"ytsearch{max_results}:{query} tutorial"

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
    except Exception as exc:
        logger.warning(f"yt-dlp search failed for query '{query}': {exc}")
        return []

    return results

async def search_videos(query: str, max_results: int = 6, timeout_sec: float = 22.0) -> List[Dict[str, Any]]:
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_search_videos_sync, query, max_results),
            timeout=timeout_sec
        )
    except Exception as exc:
        logger.warning(f"YouTube search timed out or failed for query '{query}': {exc}")
        return []
