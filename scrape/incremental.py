"""
Helpers for incremental scraping.

The pattern: each scraper loads its existing public/data/<platform>_posts.json,
builds a set of known IDs, paginates/scrolls until it sees STOP_AFTER_KNOWN
consecutive already-known posts, then merges the new posts on top of the
existing list (new wins on conflict).

This means typical "refresh" runs only touch the <50 posts you've added since
the last scrape, which:
  - Is dramatically faster (IG drops from 56 pages to ~2-3)
  - Keeps engagement metrics for older posts intact (we only overwrite on
    actual new data)
  - Reduces the chance of tripping platform rate limits (esp. TikTok)
"""

from __future__ import annotations

import json
from pathlib import Path

# Stop scraping a platform after we've seen this many consecutive posts
# already in our local dataset.
STOP_AFTER_KNOWN = 8


def load_existing(data_file: Path) -> tuple[list[dict], set[str]]:
    """Return (existing_posts_list, set_of_existing_ids)."""
    if not data_file.exists():
        return [], set()
    try:
        posts = json.loads(data_file.read_text())
        if not isinstance(posts, list):
            return [], set()
        ids = {p.get("id") for p in posts if p.get("id")}
        return posts, ids
    except (json.JSONDecodeError, OSError):
        return [], set()


def merge(existing: list[dict], new: list[dict]) -> list[dict]:
    """Merge new posts into existing — new wins on id conflict, missing
    fields preserved from existing."""
    by_id: dict[str, dict] = {p["id"]: dict(p) for p in existing if p.get("id")}
    for p in new:
        pid = p.get("id")
        if not pid:
            continue
        if pid in by_id:
            # Overlay new fields on top of existing, but keep non-empty
            # existing values when new is empty (don't lose engagement data
            # from a previous richer scrape).
            merged = dict(by_id[pid])
            for k, v in p.items():
                if v not in (None, "", 0, "0.00"):
                    merged[k] = v
            by_id[pid] = merged
        else:
            by_id[pid] = dict(p)
    return list(by_id.values())
