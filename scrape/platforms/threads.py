"""
Threads scraper — SCAFFOLD ONLY.

The original v1 scrape used the GraphQL operation
BarcelonaProfileThreadsTabRefetchableDirectQuery against /api/graphql.

Plug-in checklist:
1. Open https://www.threads.net/@<handle> in Chrome.
2. In DevTools → Network, capture one BarcelonaProfileThreadsTabRefetchableDirectQuery
   request. Note the doc_id and required variables (after, first, userID).
3. Get the user ID from the page (window.__INITIAL_DATA__ usually).
4. POST to /api/graphql with: { fb_dtsg, lsd, doc_id, variables: {...} }
5. Page through results using `pageInfo.endCursor`.
6. Map to our Post schema (id with `th_` prefix).
"""

from __future__ import annotations

from scrape.cdp import CDPError
from scrape.handles import HANDLES


def scrape(max_pages: int = 50, on_progress=None) -> dict:
    raise CDPError(
        f"Threads scraper not yet implemented for @{HANDLES['threads']}. "
        "See scrape/platforms/threads.py for the plug-in checklist."
    )
