# FWP Scraper Service

Tiny stdlib-only HTTP service the dashboard's Refresh button calls to
re-scrape Instagram / TikTok / YouTube / Threads.

## Run it

```bash
python3 scrape/server.py
# → http://localhost:5556
```

The dashboard auto-detects the service via `/ping`. The button shows a
clear "service not running" message when it's offline so you always
know the state.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/ping` | Health check — returns `{"ok": true, "version": "0.1.0"}` |
| POST | `/scrape` | Queue a scrape. Body: `{"platforms": [...]}` (optional). Returns the job. |
| GET | `/scrape-status?id=<jobId>` | Poll job state |
| GET | `/jobs` | Last 20 jobs |

Job shape:
```json
{
  "id": "abc123",
  "status": "queued|running|complete|error",
  "platforms": ["instagram", "tiktok", "youtube", "threads"],
  "startedAt": "2026-04-25T20:01:33+00:00",
  "etaSeconds": 32,
  "currentPlatform": "instagram",
  "progress": 25,
  "isStub": true
}
```

## Status

**This is a STUB.** Each platform's `scrape_*()` function sleeps for 8
seconds and updates `public/data/scrape_state.json` with a fresh
`lastScrapedDate`. The dashboard's UI flow is fully working — modals,
polling, completion banners, freshness badges all behave exactly as
they will once real scraping is wired in.

## Plug in real scrapers

Each `scrape_<platform>()` function in `server.py` must:

1. Run the actual Chrome CDP work (port 9222 must be open + Phil
   logged in).
2. Write the new posts to `public/data/<platform>_posts.json`.
3. Return `{"totalScraped": int, "lastPostId": str | None}` — the
   service writes both into `scrape_state.json` automatically.

Reference for the original scraping methods (one-shot 2026-03-28):
- **Instagram:** profile grid scroll → `/api/v1/media/{id}/info/`
- **TikTok:** `api/post/item_list` cursor pagination
- **YouTube:** channel `/videos` page + innertube `/next`
- **Threads:** GraphQL `BarcelonaProfileThreadsTabRefetchableDirectQuery`

## Configuration

`STUB_SECONDS_PER_PLATFORM` at the top of `server.py` controls the
fake job duration. Set lower to test the UI faster.
