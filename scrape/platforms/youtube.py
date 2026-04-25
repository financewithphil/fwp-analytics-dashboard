"""
YouTube scraper — SCAFFOLD ONLY.

The original v1 scrape pulled the channel `/videos` page then used the
innertube `/youtubei/v1/next` endpoint to enrich engagement counts.

Plug-in checklist:
1. Open https://www.youtube.com/<handle>/videos in Chrome.
2. Inspect the ytInitialData global to get the initial videos list.
3. For paginated continuation, POST to /youtubei/v1/browse with the
   continuation token + INNERTUBE_API_KEY (read window.ytcfg.data_).
4. For per-video like counts, call /youtubei/v1/next with videoId.
5. Map to our Post schema (id with `yt_` prefix).
"""

from __future__ import annotations

from scrape.cdp import CDPError
from scrape.handles import HANDLES


def scrape(max_pages: int = 50, on_progress=None) -> dict:
    raise CDPError(
        f"YouTube scraper not yet implemented for {HANDLES['youtube']}. "
        "See scrape/platforms/youtube.py for the plug-in checklist."
    )
