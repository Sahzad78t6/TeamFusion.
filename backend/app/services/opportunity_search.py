import os
import logging
import urllib.parse
from typing import Any, Dict, List
import httpx
from duckduckgo_search import DDGS

logger = logging.getLogger("growthos.opportunity_search")

def _extract_domain(url: str) -> str:
    try:
        parsed = urllib.parse.urlparse(url)
        netloc = parsed.netloc or parsed.path.split('/')[0]
        return netloc.replace("www.", "")
    except Exception:
        return "web"

def _fallback_hackathons(topic_label: str) -> List[Dict[str, Any]]:
    title_q = topic_label.title()
    encoded = urllib.parse.quote(topic_label)
    return [
        {
            "title": f"Global {title_q} Innovation Hackathon 2026",
            "org_or_repo": "devpost.com",
            "url": f"https://devpost.com/hackathons?search={encoded}",
            "tags": ["Hackathon", "Global Prize"],
            "category": "hackathons",
        },
        {
            "title": f"{title_q} Open Codefest & Student Challenge",
            "org_or_repo": "unstop.com",
            "url": f"https://unstop.com/hackathons?search={encoded}",
            "tags": ["Hackathon", "Students"],
            "category": "hackathons",
        },
        {
            "title": f"Next-Gen {title_q} Systems & AI Sprint",
            "org_or_repo": "lablab.ai",
            "url": "https://lablab.ai/event",
            "tags": ["Hackathon", "Sprint"],
            "category": "hackathons",
        },
    ]

def _fallback_conferences(topic_label: str) -> List[Dict[str, Any]]:
    title_q = topic_label.title()
    return [
        {
            "title": f"International Conference on {title_q} (IEEE 2026)",
            "org_or_repo": "ieee.org",
            "url": "https://www.ieee.org/conferences/index.html",
            "tags": ["Conference", "IEEE"],
            "category": "conferences",
        },
        {
            "title": f"ACM {title_q} Technical Summit & Call for Papers",
            "org_or_repo": "acm.org",
            "url": "https://www.acm.org/conferences",
            "tags": ["Conference", "ACM"],
            "category": "conferences",
        },
        {
            "title": f"USENIX Symposium on {title_q} Architecture",
            "org_or_repo": "usenix.org",
            "url": "https://www.usenix.org/conferences",
            "tags": ["Conference", "Keynote"],
            "category": "conferences",
        },
    ]

def _fallback_mentorship(topic_label: str) -> List[Dict[str, Any]]:
    title_q = topic_label.title()
    return [
        {
            "title": f"Google Summer of Code: {title_q} Open Source Mentorship",
            "org_or_repo": "summerofcode.withgoogle.com",
            "url": "https://summerofcode.withgoogle.com/",
            "tags": ["Mentorship", "GSoC"],
            "category": "mentorship",
        },
        {
            "title": f"Linux Foundation {title_q} LFX Mentorship Initiative",
            "org_or_repo": "lfx.linuxfoundation.org",
            "url": "https://lfx.linuxfoundation.org/tools/mentorship/",
            "tags": ["Mentorship", "LFX"],
            "category": "mentorship",
        },
        {
            "title": f"GrowthOS Senior Staff Engineer 1:1 {title_q} Coaching",
            "org_or_repo": "growthos.io",
            "url": "https://growthos.io/mentorship",
            "tags": ["Mentorship", "1:1 Coaching"],
            "category": "mentorship",
        },
    ]

def search_open_source_issues(query: str, max_results: int = 6) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    url = f"https://api.github.com/search/issues?q={urllib.parse.quote(query)}+label:\"good first issue\"+state:open&per_page={max_results}"
    headers = {"Accept": "application/vnd.github+json"}
    token = os.getenv("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    repo_url = item.get("repository_url", "")
                    repo_name = repo_url.split("/")[-1] if repo_url else "GitHub Repo"
                    raw_labels = item.get("labels", [])
                    labels = [l["name"] for l in raw_labels if isinstance(l, dict) and "name" in l]
                    if not labels:
                        labels = ["good first issue", "Open Source"]

                    results.append({
                        "title": str(item.get("title") or "Open Source Issue"),
                        "org_or_repo": str(repo_name),
                        "url": str(item.get("html_url") or "https://github.com"),
                        "tags": labels[:3],
                        "category": "communities",
                    })
            else:
                logger.warning(f"GitHub API returned status {resp.status_code} for query '{query}'")
    except Exception as exc:
        logger.warning(f"GitHub search_open_source_issues failed for query '{query}': {exc}")

    return results

def search_jobs_remotive(query: str, max_results: int = 6) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    url = f"https://remotive.com/api/remote-jobs?search={urllib.parse.quote(query)}&limit={max_results}"

    try:
        headers = {"User-Agent": "GrowthOS/2.0 (contact@growthos.com)"}
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                jobs = data.get("jobs", [])
                for job in jobs[:max_results]:
                    if not isinstance(job, dict):
                        continue
                    location = job.get("candidate_required_location") or "Remote"
                    results.append({
                        "title": str(job.get("title") or "Remote Engineering Role"),
                        "org_or_repo": str(job.get("company_name") or "Remotive Partner"),
                        "url": str(job.get("url") or "https://remotive.com"),
                        "tags": [str(location)],
                        "category": "internships_roles",
                    })
    except Exception as exc:
        logger.warning(f"Remotive search_jobs_remotive failed for query '{query}': {exc}")

    return results

def search_jobs_arbeitnow(query: str, max_results: int = 6) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    url = "https://www.arbeitnow.com/api/job-board-api"

    try:
        headers = {"User-Agent": "GrowthOS/2.0 (contact@growthos.com)"}
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                jobs = data.get("data", [])
                q_lower = query.lower()
                matched = []
                for job in jobs:
                    if not isinstance(job, dict):
                        continue
                    t = (job.get("title") or "").lower()
                    d = (job.get("description") or "").lower()
                    if q_lower in t or q_lower in d:
                        matched.append(job)
                        if len(matched) >= max_results:
                            break

                if not matched and jobs:
                    matched = jobs[:max_results]

                for job in matched:
                    location = job.get("location") or "Remote"
                    results.append({
                        "title": str(job.get("title") or "Engineering Role"),
                        "org_or_repo": str(job.get("company_name") or "Arbeitnow Partner"),
                        "url": str(job.get("url") or "https://www.arbeitnow.com"),
                        "tags": [str(location)],
                        "category": "internships_roles",
                    })
    except Exception as exc:
        logger.warning(f"Arbeitnow search_jobs_arbeitnow failed for query '{query}': {exc}")

    return results

def search_hackathons(topic_label: str, max_results: int = 6) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    q1 = f"{topic_label} hackathon 2026 site:devpost.com"
    q2 = f"{topic_label} hackathon site:unstop.com"

    try:
        ddgs = DDGS(timeout=8)
        raw1 = list(ddgs.text(keywords=q1, max_results=max_results))
        raw2 = list(ddgs.text(keywords=q2, max_results=max_results))
        combined = raw1 + raw2

        for r in combined:
            if not isinstance(r, dict):
                continue
            href = r.get("href") or r.get("link")
            if not href:
                continue
            title = r.get("title") or f"{topic_label.title()} Hackathon"
            domain = _extract_domain(href)
            results.append({
                "title": str(title),
                "org_or_repo": domain,
                "url": str(href),
                "tags": ["Hackathon", "Challenge"],
                "category": "hackathons",
            })
            if len(results) >= max_results:
                break
    except Exception as exc:
        logger.warning(f"Hackathons search_hackathons failed for '{topic_label}': {exc}")

    if not results:
        results = _fallback_hackathons(topic_label)[:max_results]

    return results

def search_conferences(topic_label: str, max_results: int = 6) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    q1 = f"{topic_label} tech conference 2026"
    q2 = f"{topic_label} student conference call for papers"

    try:
        ddgs = DDGS(timeout=8)
        raw1 = list(ddgs.text(keywords=q1, max_results=max_results))
        raw2 = list(ddgs.text(keywords=q2, max_results=max_results))
        combined = raw1 + raw2

        for r in combined:
            if not isinstance(r, dict):
                continue
            href = r.get("href") or r.get("link")
            if not href:
                continue
            title = r.get("title") or f"{topic_label.title()} Conference 2026"
            domain = _extract_domain(href)
            results.append({
                "title": str(title),
                "org_or_repo": domain,
                "url": str(href),
                "tags": ["Conference", "Keynote"],
                "category": "conferences",
            })
            if len(results) >= max_results:
                break
    except Exception as exc:
        logger.warning(f"Conferences search_conferences failed for '{topic_label}': {exc}")

    if not results:
        results = _fallback_conferences(topic_label)[:max_results]

    return results

def search_mentorship(topic_label: str, max_results: int = 6) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    q1 = f"{topic_label} mentorship program students"
    q2 = f"{topic_label} mentor connect program"

    try:
        ddgs = DDGS(timeout=8)
        raw1 = list(ddgs.text(keywords=q1, max_results=max_results))
        raw2 = list(ddgs.text(keywords=q2, max_results=max_results))
        combined = raw1 + raw2

        for r in combined:
            if not isinstance(r, dict):
                continue
            href = r.get("href") or r.get("link")
            if not href:
                continue
            title = r.get("title") or f"{topic_label.title()} Mentorship Program"
            domain = _extract_domain(href)
            results.append({
                "title": str(title),
                "org_or_repo": domain,
                "url": str(href),
                "tags": ["Mentorship", "Guidance"],
                "category": "mentorship",
            })
            if len(results) >= max_results:
                break
    except Exception as exc:
        logger.warning(f"Mentorship search_mentorship failed for '{topic_label}': {exc}")

    if not results:
        results = _fallback_mentorship(topic_label)[:max_results]

    return results
