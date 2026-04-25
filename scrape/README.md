# FWP Scraper Service

Stdlib + websocket-client HTTP service the dashboard's Refresh button calls
to re-scrape Instagram / TikTok / YouTube / Threads.

## Setup (one-time)

```bash
pip install websocket-client     # tiny Chrome CDP client dep
```

## Run it

```bash
# 1. Quit Chrome completely (so it can restart with debug enabled)
osascript -e 'quit app "Google Chrome"'

# 2. Restart Chrome with the debugging port open. Use a separate user-data
#    dir so it doesn't conflict with your normal Chrome profile.
open -na "Google Chrome" --args \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.fwp-chrome-debug"

# 3. In that new Chrome window, log in to:
#    - https://www.instagram.com/  (real one, your account)
#    - https://www.tiktok.com/     (when TT scraper is plugged in)
#    - https://www.youtube.com/    (when YT scraper is plugged in)
#    - https://www.threads.net/    (when TH scraper is plugged in)

# 4. Start the scraper service
python3 ~/projects/fwp-analytics-dashboard/scrape/server.py
```

Then open the dashboard and click `↻ Refresh data` in the header.

## Status of each platform

| Platform | Status | Notes |
|---|---|---|
| Instagram | **REAL** | Live. Uses `/api/v1/users/web_profile_info` + `/api/v1/feed/user/<pk>/` via Chrome CDP. Logged-in cookies in your Chrome profile authorize the requests. |
| TikTok | Scaffold | Raises CDPError. See `scrape/platforms/tiktok.py` for the plug-in checklist. |
| YouTube | Scaffold | Raises CDPError. See `scrape/platforms/youtube.py` for the plug-in checklist. |
| Threads | Scaffold | Raises CDPError. See `scrape/platforms/threads.py` for the plug-in checklist. |

When a scaffolded platform fails, the dashboard's job record marks it as
errored, but other platforms still run + complete. The freshness badges
update for whichever platforms succeed.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/ping` | Health check |
| POST | `/scrape` | Queue a scrape. Body: `{"platforms": [...]}` (optional, defaults to all) |
| GET | `/scrape-status?id=<jobId>` | Poll job state |
| GET | `/jobs` | Last 20 jobs |

## Where stuff lives

```
scrape/
├── server.py              HTTP service (port 5556)
├── cdp.py                 Minimal Chrome DevTools Protocol client
├── handles.py             Phil's per-platform handles
├── platforms/
│   ├── instagram.py       REAL scraper
│   ├── tiktok.py          Scaffold
│   ├── youtube.py         Scaffold
│   └── threads.py         Scaffold
└── README.md
```

## Plug-in steps for the remaining platforms

Each scaffold has a checklist comment. The pattern is always:

1. Open the platform in Chrome (logged in).
2. Use DevTools → Network to capture the actual request your browser
   makes to load the data you want.
3. Replicate that request via `cdp._evaluate_fetch()` (which runs
   `fetch()` in the page context — cookies + CSRF tokens come for free).
4. Map the response shape to the `Post` schema (see `instagram._parse_post`).
5. Persist to `public/data/<platform>_posts.json`.
