"""
TikTok scraper — SCAFFOLD ONLY.

The original v1 scrape used `api/post/item_list` which is the public web API.
This scaffold has the request shape but needs validation + signing logic
once Phil's Chrome session is available to test against.

Plug-in checklist:
1. Open https://www.tiktok.com/@<handle> in Chrome.
2. Capture an authenticated request to api/post/item_list to inspect:
   - Required query params (secUid, cursor, count, msToken, _signature, etc.)
   - Required headers (User-Agent, Referer, etc.)
3. Replicate via _evaluate_fetch() in the page context.
4. Map the response items to our Post schema (parse_post pattern from instagram.py).
"""

from __future__ import annotations

from scrape.cdp import CDPError
from scrape.handles import HANDLES


def scrape(max_pages: int = 50, on_progress=None) -> dict:
    raise CDPError(
        f"TikTok scraper not yet implemented for @{HANDLES['tiktok']}. "
        "See scrape/platforms/tiktok.py for the plug-in checklist."
    )
