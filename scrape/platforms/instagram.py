"""
Instagram scraper.

Strategy: navigate Chrome to instagram.com/<handle>/ so the session cookies
are loaded, then run fetch() in the page context via CDP Runtime.evaluate.
The page handles auth automatically — no header replay needed.

Endpoints used:
    GET /api/v1/users/web_profile_info/?username=<handle>   -> {data: {user: {id, full_name, edge_owner_to_timeline_media: {count}, ...}}}
    GET /api/v1/feed/user/<pk>/?count=12[&max_id=<cursor>]  -> {items: [...], more_available, next_max_id}

Each item has play_count (for reels), like_count, comment_count, caption,
taken_at (epoch), etc.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from scrape.cdp import CDP, CDPError
from scrape.handles import HANDLES

DATA_FILE = Path(__file__).resolve().parent.parent.parent / "public" / "data" / "instagram_posts.json"
APP_ID = "936619743392459"
PAGE_URL = f"https://www.instagram.com/{HANDLES['instagram']}/"


def _evaluate_fetch(cdp: CDP, path: str) -> dict:
    expr = (
        f"fetch({json.dumps(path)}, {{ headers: {{ 'X-IG-App-ID': {json.dumps(APP_ID)} }}, credentials: 'include' }})"
        ".then(r => r.text()).then(t => { try { return JSON.parse(t); } catch(e) { return { __error: 'parse', body: t.slice(0,500) }; } })"
    )
    return cdp.evaluate(expr, await_promise=True)


def _parse_post(item: dict) -> dict:
    """Convert Instagram media object to our Post schema."""
    pk = item.get("id") or item.get("pk")
    code = item.get("code")
    caption = ((item.get("caption") or {}).get("text")) or ""
    media_type = item.get("media_type")  # 1=image, 2=video, 8=carousel
    product_type = item.get("product_type")  # clips=reel, feed, igtv
    type_str = "reel" if product_type == "clips" else "carousel" if media_type == 8 else "video" if media_type == 2 else "post"
    views = item.get("play_count") or item.get("view_count") or 0
    likes = item.get("like_count") or 0
    comments = item.get("comment_count") or 0
    taken_at = item.get("taken_at")
    iso_dt = time.strftime("%Y-%m-%d", time.localtime(taken_at)) if taken_at else ""
    iso_t = time.strftime("%H:%M", time.localtime(taken_at)) if taken_at else ""
    thumb = ((item.get("image_versions2") or {}).get("candidates") or [{}])[0].get("url") or ""
    eng = ((likes + comments) / views * 100) if views else 0
    hashtags = " ".join(t for t in caption.split() if t.startswith("#"))
    return {
        "id": f"ig_{pk}",
        "url": f"https://www.instagram.com/p/{code}/" if code else "",
        "title": caption.split("\n", 1)[0][:120] if caption else "",
        "caption": caption,
        "platform": "instagram",
        "type": type_str,
        "date": iso_dt,
        "time": iso_t,
        "views": views,
        "likes": likes,
        "comments": comments,
        "shares": 0,
        "saves": 0,
        "engagementRate": f"{eng:.2f}",
        "hashtags": hashtags,
        "duration": "",
        "thumbnailUrl": thumb,
        "notes": "",
    }


def scrape(max_pages: int = 60, on_progress=None) -> dict:
    """Scrape posts from instagram.com/<handle>/ via Chrome CDP.

    `on_progress(stage: str, info: dict)` is called periodically so the
    HTTP server can surface live status to the dashboard.
    """
    handle = HANDLES["instagram"]
    cdp = CDP()
    try:
        tab = cdp.open_tab(PAGE_URL)
        cdp.attach(tab)
        cdp.wait_for_load(timeout=20)

        # Resolve user pk
        if on_progress:
            on_progress("resolving user", {"handle": handle})
        profile = _evaluate_fetch(cdp, f"/api/v1/users/web_profile_info/?username={handle}")
        if not profile or "data" not in profile:
            raise CDPError(f"web_profile_info returned: {str(profile)[:200]}")
        user = profile["data"]["user"]
        pk = user["id"]
        full_name = user.get("full_name") or handle

        # Page through feed
        posts: list[dict] = []
        cursor: str | None = None
        for page_idx in range(max_pages):
            path = f"/api/v1/feed/user/{pk}/?count=12"
            if cursor:
                path += f"&max_id={cursor}"
            feed = _evaluate_fetch(cdp, path)
            if not feed:
                break
            items = feed.get("items") or []
            for it in items:
                posts.append(_parse_post(it))
            if on_progress:
                on_progress("paginating", {"page": page_idx + 1, "totalPosts": len(posts)})
            if not feed.get("more_available"):
                break
            cursor = feed.get("next_max_id")
            if not cursor:
                break
            time.sleep(0.6)  # be polite
    finally:
        cdp.detach()

    # Persist
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(posts, indent=2))

    return {
        "totalScraped": len(posts),
        "lastPostId": posts[0]["id"] if posts else None,
        "fullName": full_name,
    }
