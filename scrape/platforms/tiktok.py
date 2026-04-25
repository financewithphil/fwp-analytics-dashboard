"""
TikTok scraper.

TikTok loads its post grid via service-worker-mediated XHR that bypasses
window.fetch and XMLHttpRequest hooks. So instead of intercepting the
network, we just scroll the page until all post tiles are rendered and
extract from the DOM.

What we get from each [data-e2e="user-post-item"] tile:
  - video ID (from the /@user/video/<id> href)
  - view count (data-e2e="video-views", parsed from "17K"/"1.2M" text)
  - caption + hashtags (from img alt text — TT puts the full description there)
  - pinned flag (data-e2e="video-card-badge")
  - thumbnail URL (from <picture><source srcset>)

What we DON'T get from the DOM (would require per-post page hits):
  - likes / comments / shares / saves
  - exact post date
  - video duration

Trade-off: less rich than the v1 data but full coverage of all posts and
the most analytically valuable metric (views) per post.
"""

from __future__ import annotations

import json
import re
import time
from pathlib import Path

from scrape.cdp import CDP, CDPError
from scrape.handles import HANDLES

DATA_FILE = Path(__file__).resolve().parent.parent.parent / "public" / "data" / "tiktok_posts.json"
HANDLE = HANDLES["tiktok"]
PAGE_URL = f"https://www.tiktok.com/@{HANDLE}"


_EXTRACT_TILES = """
(function() {
  var tiles = Array.from(document.querySelectorAll('[data-e2e="user-post-item"]'));
  return tiles.map(function(tile) {
    var anchor = tile.querySelector('a[href*="/video/"]');
    var viewEl = tile.querySelector('[data-e2e="video-views"]');
    var badge = tile.querySelector('[data-e2e="video-card-badge"]');
    var img = tile.querySelector('img[alt]');
    var pic = tile.querySelector('picture source[srcset]');
    var srcset = pic ? pic.getAttribute('srcset') : '';
    // First URL in srcset before the size descriptor
    var thumb = '';
    if (srcset) {
      var m = srcset.match(/(\\bhttps?:[^\\s,]+)/);
      if (m) thumb = m[1];
    }
    return {
      href: anchor ? anchor.href : '',
      views: viewEl ? viewEl.innerText : '',
      pinned: !!badge && /pinned/i.test(badge.innerText || ''),
      alt: img ? img.alt : '',
      thumb: thumb,
    };
  }).filter(function(t) { return t.href; });
})()
"""


def _parse_views(s: str) -> int:
    """Turn '17K' / '1.2M' / '345' into an int."""
    if not s:
        return 0
    s = s.replace(",", "").strip().lower()
    mult = 1
    if s.endswith("k"):
        mult, s = 1_000, s[:-1]
    elif s.endswith("m"):
        mult, s = 1_000_000, s[:-1]
    elif s.endswith("b"):
        mult, s = 1_000_000_000, s[:-1]
    try:
        return int(float(s.strip()) * mult)
    except (ValueError, TypeError):
        return 0


_VIDEO_ID_RE = re.compile(r"/video/(\d+)")


def _parse_alt(alt: str) -> tuple[str, str, str]:
    """TT alt format: 'Caption #hashtags created by <handle> with <music>'.
    Returns (caption, hashtags_string, music)."""
    if not alt:
        return "", "", ""
    music = ""
    main = alt
    if " with " in alt:
        main, _, music = alt.rpartition(" with ")
    if " created by " in main:
        main = main.split(" created by ")[0]
    hashtags = " ".join(t for t in main.split() if t.startswith("#"))
    return main.strip(), hashtags, music.strip()


def _to_post(tile: dict) -> dict | None:
    href = tile.get("href") or ""
    m = _VIDEO_ID_RE.search(href)
    if not m:
        return None
    vid = m.group(1)
    caption, hashtags, _music = _parse_alt(tile.get("alt") or "")
    title = caption.split("\n", 1)[0][:120] if caption else ""
    views = _parse_views(tile.get("views") or "")
    return {
        "id": f"tt_{vid}",
        "url": href,
        "title": title,
        "caption": caption,
        "platform": "tiktok",
        "type": "video",
        "date": "",
        "time": "",
        "views": views,
        "likes": 0,
        "comments": 0,
        "shares": 0,
        "saves": 0,
        "engagementRate": "0.00",
        "hashtags": hashtags,
        "duration": "",
        "thumbnailUrl": tile.get("thumb") or "",
        "notes": "Pinned" if tile.get("pinned") else "",
    }


def scrape(max_pages: int = 80, on_progress=None) -> dict:
    cdp = CDP()
    posts_by_id: dict[str, dict] = {}

    try:
        cdp.open_tab(PAGE_URL)
        cdp.wait_for_load(timeout=25, expect_url_substring=f"@{HANDLE}")
        time.sleep(3.5)

        # Sanity check: did the page actually render?
        rendered = cdp.evaluate("document.querySelectorAll('a[href*=\"/video/\"]').length") or 0
        if rendered == 0:
            err_text = cdp.evaluate("document.body.innerText.slice(0,200)") or ""
            raise CDPError(
                f"TikTok page didn't render posts for @{HANDLE} "
                f"(0 video links in DOM). Likely rate-limited / captcha. "
                f"Body text: {err_text[:150]}"
            )

        # Scroll until tile count plateaus
        last_count = 0
        stale_rounds = 0
        for round_idx in range(max_pages):
            tiles = cdp.evaluate(_EXTRACT_TILES) or []
            for t in tiles:
                post = _to_post(t)
                if post and post["id"] not in posts_by_id:
                    posts_by_id[post["id"]] = post

            if on_progress:
                on_progress("scrolling", {
                    "round": round_idx + 1,
                    "totalPosts": len(posts_by_id),
                    "tilesInDom": len(tiles),
                })

            # Stop if no new posts for several rounds
            if len(posts_by_id) == last_count:
                stale_rounds += 1
                if stale_rounds >= 4:
                    break
            else:
                stale_rounds = 0
            last_count = len(posts_by_id)

            cdp.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(1.8)

        # Final extraction
        tiles = cdp.evaluate(_EXTRACT_TILES) or []
        for t in tiles:
            post = _to_post(t)
            if post and post["id"] not in posts_by_id:
                posts_by_id[post["id"]] = post

    finally:
        cdp.detach()

    posts = list(posts_by_id.values())
    # Sort by views desc as a stable order (we don't have dates)
    posts.sort(key=lambda p: p.get("views", 0), reverse=True)

    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(posts, indent=2))

    return {
        "totalScraped": len(posts),
        "lastPostId": posts[0]["id"] if posts else None,
    }
