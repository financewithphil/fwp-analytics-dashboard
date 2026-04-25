"""
TikTok scraper.

Strategy: navigate Chrome to tiktok.com/@<handle>, extract the initial
~19 posts from window.__UNIVERSAL_DATA_FOR_REHYDRATION__, then install
an XHR hook that captures /api/post/item_list/ responses (TikTok's web
client uses XHR for the infinite-scroll pagination). Programmatically
scroll to trigger more loads, drain the captured bodies, parse posts.

Verified live 2026-04-25 against tiktok.com:
  - Initial render contains posts under
    __DEFAULT_SCOPE__["webapp.user-post-list"].itemList
  - Pagination XHRs hit /api/post/item_list/ and carry { itemList: [...] }
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from scrape.cdp import CDP, CDPError
from scrape.handles import HANDLES

DATA_FILE = Path(__file__).resolve().parent.parent.parent / "public" / "data" / "tiktok_posts.json"
HANDLE = HANDLES["tiktok"]
PAGE_URL = f"https://www.tiktok.com/@{HANDLE}"


_INSTALL_HOOK = """
(function() {
  if (window.__FWP_TT_HOOK__) return 'already';
  window.__FWP_TT_HOOK__ = true;
  window.__FWP_TT_RESPONSES = [];
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url) {
    this.__fwp_url = url;
    return origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function(body) {
    this.addEventListener('load', () => {
      try {
        const u = this.__fwp_url || '';
        const t = this.responseText || '';
        if (t.length > 500 && (u.indexOf('/api/post/item_list') >= 0 || u.indexOf('/api/user/post') >= 0)) {
          window.__FWP_TT_RESPONSES.push({ url: u, length: t.length, body: t });
          if (window.__FWP_TT_RESPONSES.length > 200) window.__FWP_TT_RESPONSES.shift();
        }
      } catch(e) {}
    });
    return origSend.apply(this, arguments);
  };
  return 'installed';
})()
"""

_DRAIN_RESPONSES = """
(function() {
  const items = window.__FWP_TT_RESPONSES || [];
  window.__FWP_TT_RESPONSES = [];
  return items;
})()
"""

_EXTRACT_INITIAL = """
(function() {
  // The data lives in a <script type="application/json" id="__UNIVERSAL_DATA_FOR_REHYDRATION__">
  // tag in the DOM, NOT on window — TikTok's React app clears the global after
  // hydrating to free memory.
  var script = document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
  if (!script) return { posts: [], secUid: null };
  var udfr;
  try { udfr = JSON.parse(script.textContent); } catch(e) { return { posts: [], secUid: null, parseError: e.message }; }
  var scope = (udfr && udfr.__DEFAULT_SCOPE__) || {};
  var upl = scope['webapp.user-post-list'] || {};
  var items = upl.itemList || [];
  var ud = scope['webapp.user-detail'] || {};
  var user = (ud.userInfo && ud.userInfo.user) || {};
  return {
    posts: items,
    secUid: user.secUid || null,
    uniqueId: user.uniqueId || null,
  };
})()
"""


def _walk(obj: Any, predicate):
    if isinstance(obj, dict):
        if predicate(obj):
            yield obj
        for v in obj.values():
            yield from _walk(v, predicate)
    elif isinstance(obj, list):
        for v in obj:
            yield from _walk(v, predicate)


def _is_tt_post(o: dict) -> bool:
    if not isinstance(o, dict):
        return False
    if "id" not in o or not isinstance(o.get("id"), str):
        return False
    return "stats" in o or "statsV2" in o or ("video" in o and "desc" in o)


def _extract_posts_from_body(body: str) -> list[dict]:
    posts: list[dict] = []
    seen_ids: set[str] = set()
    body = body.strip()
    if not body:
        return posts
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        return posts
    for node in _walk(parsed, _is_tt_post):
        vid = str(node.get("id") or "")
        if not vid or vid in seen_ids:
            continue
        seen_ids.add(vid)
        posts.append(node)
    return posts


def _to_post(raw: dict) -> dict:
    vid = str(raw.get("id") or "")
    desc = raw.get("desc") or ""
    create_time = int(raw.get("createTime") or 0)
    iso_dt = time.strftime("%Y-%m-%d", time.localtime(create_time)) if create_time else ""
    iso_t = time.strftime("%H:%M", time.localtime(create_time)) if create_time else ""
    stats = raw.get("statsV2") or raw.get("stats") or {}
    def _n(v):
        try:
            return int(v)
        except (TypeError, ValueError):
            return 0
    views = _n(stats.get("playCount"))
    likes = _n(stats.get("diggCount"))
    comments = _n(stats.get("commentCount"))
    shares = _n(stats.get("shareCount"))
    saves = _n(stats.get("collectCount"))
    eng = ((likes + comments + shares) / views * 100) if views else 0
    video = raw.get("video") or {}
    duration_secs = video.get("duration") or 0
    duration = f"{int(duration_secs)//60}:{int(duration_secs)%60:02d}" if duration_secs else ""
    thumb = video.get("cover") or video.get("originCover") or ""
    hashtags = " ".join(t for t in desc.split() if t.startswith("#"))
    title = desc.split("\n", 1)[0][:120] if desc else ""
    return {
        "id": f"tt_{vid}",
        "url": f"https://www.tiktok.com/@{HANDLE}/video/{vid}",
        "title": title,
        "caption": desc,
        "platform": "tiktok",
        "type": "video",
        "date": iso_dt,
        "time": iso_t,
        "views": views,
        "likes": likes,
        "comments": comments,
        "shares": shares,
        "saves": saves,
        "engagementRate": f"{eng:.2f}",
        "hashtags": hashtags,
        "duration": duration,
        "thumbnailUrl": thumb,
        "notes": "",
    }


def scrape(max_pages: int = 60, on_progress=None) -> dict:
    cdp = CDP()
    posts_by_id: dict[str, dict] = {}

    try:
        cdp.open_tab(PAGE_URL)
        cdp.wait_for_load(timeout=25, expect_url_substring=f"@{HANDLE}")
        time.sleep(5.0)  # TikTok hydrates slow

        # Poll for the rehydration data to appear (up to 10s extra)
        for _ in range(20):
            initial = cdp.evaluate(_EXTRACT_INITIAL) or {}
            if initial.get("posts") or initial.get("secUid"):
                break
            time.sleep(0.5)
        else:
            initial = cdp.evaluate(_EXTRACT_INITIAL) or {}
        initial_posts = initial.get("posts") or []
        for raw in initial_posts:
            vid = str(raw.get("id") or "")
            if vid and vid not in posts_by_id:
                posts_by_id[vid] = raw

        if not initial_posts and not initial.get("secUid"):
            raise CDPError(
                f"TikTok initial render empty for @{HANDLE}. "
                "Likely a captcha / login wall — open the tab in Chrome and verify."
            )

        if on_progress:
            on_progress("initial extracted", {
                "totalPosts": len(posts_by_id),
                "secUid": (initial.get("secUid") or "")[:30],
            })

        cdp.evaluate(_INSTALL_HOOK)

        stale_rounds = 0
        last_height = 0
        for round_idx in range(max_pages):
            bodies = cdp.evaluate(_DRAIN_RESPONSES) or []
            new_in_round = 0
            for entry in bodies:
                body = entry.get("body") or ""
                for raw in _extract_posts_from_body(body):
                    vid = str(raw.get("id") or "")
                    if vid and vid not in posts_by_id:
                        posts_by_id[vid] = raw
                        new_in_round += 1

            height_before = cdp.evaluate("document.body.scrollHeight") or 0
            cdp.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(2.0)
            height_after = cdp.evaluate("document.body.scrollHeight") or 0

            if on_progress:
                on_progress("scrolling", {
                    "round": round_idx + 1,
                    "totalPosts": len(posts_by_id),
                    "newInRound": new_in_round,
                    "heightDelta": height_after - height_before,
                })

            if height_after == last_height and new_in_round == 0:
                stale_rounds += 1
                if stale_rounds >= 3:
                    break
            else:
                stale_rounds = 0
            last_height = height_after

        # Final drain
        bodies = cdp.evaluate(_DRAIN_RESPONSES) or []
        for entry in bodies:
            body = entry.get("body") or ""
            for raw in _extract_posts_from_body(body):
                vid = str(raw.get("id") or "")
                if vid and vid not in posts_by_id:
                    posts_by_id[vid] = raw

    finally:
        cdp.detach()

    posts = [_to_post(raw) for raw in posts_by_id.values()]
    posts.sort(key=lambda p: p.get("date", "") or "0", reverse=True)

    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(posts, indent=2))

    return {
        "totalScraped": len(posts),
        "lastPostId": posts[0]["id"] if posts else None,
    }
