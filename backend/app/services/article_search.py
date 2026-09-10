import asyncio
import logging
import urllib.parse
from typing import Any, Dict, List
import httpx
from duckduckgo_search import DDGS

logger = logging.getLogger("growthos.article_search")

def _extract_domain(url: str) -> str:
    try:
        parsed = urllib.parse.urlparse(url)
        netloc = parsed.netloc or parsed.path.split('/')[0]
        return netloc.replace("www.", "")
    except Exception:
        return "web"

def _fallback_curated_articles(query: str) -> List[Dict[str, Any]]:
    formatted_query = query.title()
    return [
        {
            "title": f"Complete {formatted_query} Comprehensive Guide & Best Practices",
            "url": f"https://www.geeksforgeeks.org/{query.lower().replace(' ', '-')}/",
            "snippet": f"Learn {formatted_query} from scratch with structured examples, core fundamentals, and practical code walkthroughs.",
            "source": "geeksforgeeks.org",
        },
        {
            "title": f"Interactive {formatted_query} Tutorial & Reference Manual",
            "url": f"https://www.w3schools.com/{query.lower().replace(' ', '')}/",
            "snippet": f"Master {formatted_query} with bite-sized lessons, interactive code execution, and topic-by-topic exercises.",
            "source": "w3schools.com",
        },
        {
            "title": f"Deep Dive into {formatted_query}: Architecture & Implementation",
            "url": f"https://realpython.com/search/?q={urllib.parse.quote(query)}",
            "snippet": f"In-depth technical articles covering {formatted_query} concepts, optimization strategies, and real-world patterns.",
            "source": "realpython.com",
        },
        {
            "title": f"freeCodeCamp {formatted_query} Handbook",
            "url": f"https://www.freecodecamp.org/news/tag/{query.lower().replace(' ', '-')}/",
            "snippet": f"Open-source community handbook explaining {formatted_query} with visual diagrams and hands-on projects.",
            "source": "freecodecamp.org",
        },
    ]

def _search_articles_sync(query: str, max_results: int = 6) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    search_term = f"{query} tutorial guide"
    
    try:
        ddgs = DDGS(timeout=8)
        raw_results = list(ddgs.text(keywords=search_term, max_results=max_results))
        for r in raw_results:
            if not r or not isinstance(r, dict):
                continue
            href = r.get("href") or r.get("link")
            if not href:
                continue
            
            title = r.get("title") or f"{query.title()} Article"
            body = r.get("body") or r.get("snippet") or ""
            domain = _extract_domain(href)

            results.append({
                "title": str(title),
                "url": str(href),
                "snippet": str(body)[:200],
                "source": domain,
            })
    except Exception as exc:
        logger.warning(f"DuckDuckGo article search failed for query '{query}': {exc}")

    if not results:
        logger.info(f"Using curated article fallback for query '{query}'")
        results = _fallback_curated_articles(query)[:max_results]

    return results

async def search_articles(query: str, max_results: int = 6, timeout_sec: float = 18.0) -> List[Dict[str, Any]]:
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_search_articles_sync, query, max_results),
            timeout=timeout_sec
        )
    except Exception as exc:
        logger.warning(f"Article search timed out or failed for query '{query}': {exc}")
        return _fallback_curated_articles(query)[:max_results]
