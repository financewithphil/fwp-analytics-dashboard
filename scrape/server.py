#!/usr/bin/env python3
"""
FWP Scraper Service — port 5556

Stdlib-only HTTP service the dashboard's Refresh button calls to start
a re-scrape of Instagram / TikTok / YouTube / Threads data.

Tonight's build is a STUB: /scrape accepts a request, simulates work for
a configurable number of seconds, then writes a fresh `lastScrapedDate`
into `public/data/scrape_state.json` so the UI shows updated freshness.
The platform-by-platform scraping logic plugs into `run_scrape()` next
session — see TODO blocks below.

Run:
    python3 scrape/server.py

Endpoints:
    GET  /ping                     -> {"ok": true, "version": "0.1.0"}
    POST /scrape                   -> {"jobId": "...", "startedAt": "..."}
    GET  /scrape-status?id=<jobId> -> {"status": "running"|"complete"|"error", ...}
    GET  /jobs                     -> list of recent jobs
"""

from __future__ import annotations

import json
import threading
import time
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

PORT = 5556
VERSION = "0.1.0"

# Resolve paths relative to this file so it works no matter where it's run from.
ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "public" / "data"
SCRAPE_STATE = DATA_DIR / "scrape_state.json"

# In-memory job registry. Restarting the server clears it — that's fine for the
# stub. A persistent store (sqlite or jobs/*.json) is a follow-up if needed.
JOBS: dict[str, dict] = {}
JOBS_LOCK = threading.Lock()

# How long the stub takes to "scrape" each platform. Real scraping will
# replace this with actual Chrome-CDP work.
STUB_SECONDS_PER_PLATFORM = 8
PLATFORMS = ["instagram", "tiktok", "youtube", "threads"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def load_scrape_state() -> dict:
    if SCRAPE_STATE.exists():
        return json.loads(SCRAPE_STATE.read_text())
    return {}


def save_scrape_state(state: dict) -> None:
    SCRAPE_STATE.parent.mkdir(parents=True, exist_ok=True)
    SCRAPE_STATE.write_text(json.dumps(state, indent=2))


def update_job(job_id: str, **fields) -> None:
    with JOBS_LOCK:
        if job_id in JOBS:
            JOBS[job_id].update(fields)


# ---------------------------------------------------------------------------
# Real scraper plug-points (next session) -----------------------------------
# ---------------------------------------------------------------------------
# Each function below MUST:
#   - return a dict with at least: {"totalScraped": int, "lastPostId": str|None}
#   - update the JSON files under public/data/ in place when implemented
#
# Today they sleep + return zeros so the UI flow is fully testable.
def scrape_instagram() -> dict:
    # TODO: Chrome CDP scrape — profile grid scroll then
    #       /api/v1/media/{id}/info/ for play_count.
    time.sleep(STUB_SECONDS_PER_PLATFORM)
    return {"totalScraped": 0, "lastPostId": None}


def scrape_tiktok() -> dict:
    # TODO: Chrome CDP scrape — api/post/item_list cursor pagination.
    time.sleep(STUB_SECONDS_PER_PLATFORM)
    return {"totalScraped": 0, "lastPostId": None}


def scrape_youtube() -> dict:
    # TODO: Chrome CDP scrape — channel /videos page + innertube /next.
    time.sleep(STUB_SECONDS_PER_PLATFORM)
    return {"totalScraped": 0, "lastPostId": None}


def scrape_threads() -> dict:
    # TODO: Chrome CDP scrape — BarcelonaProfileThreadsTabRefetchableDirectQuery.
    time.sleep(STUB_SECONDS_PER_PLATFORM)
    return {"totalScraped": 0, "lastPostId": None}


PLATFORM_RUNNERS = {
    "instagram": scrape_instagram,
    "tiktok": scrape_tiktok,
    "youtube": scrape_youtube,
    "threads": scrape_threads,
}


def run_scrape(job_id: str, platforms: list[str]) -> None:
    """Worker thread — runs the platform scrapers sequentially and updates
    the in-memory job state + scrape_state.json as it goes."""
    update_job(job_id, status="running", currentPlatform=None, progress=0)
    state = load_scrape_state()
    completed = 0
    try:
        for platform in platforms:
            runner = PLATFORM_RUNNERS.get(platform)
            if not runner:
                continue
            update_job(job_id, currentPlatform=platform)
            result = runner()
            sub = state.get(platform, {}) or {}
            sub["lastScrapedDate"] = now_iso()
            sub.setdefault("status", "complete")
            if result.get("totalScraped"):
                sub["totalScraped"] = result["totalScraped"]
            if result.get("lastPostId"):
                sub["lastPostId"] = result["lastPostId"]
            state[platform] = sub
            save_scrape_state(state)
            completed += 1
            update_job(
                job_id,
                progress=int(completed / len(platforms) * 100),
            )
        update_job(
            job_id,
            status="complete",
            currentPlatform=None,
            progress=100,
            completedAt=now_iso(),
        )
    except Exception as exc:  # noqa: BLE001
        update_job(job_id, status="error", error=str(exc), completedAt=now_iso())


# ---------------------------------------------------------------------------
# HTTP layer ----------------------------------------------------------------
# ---------------------------------------------------------------------------
class Handler(BaseHTTPRequestHandler):
    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, status: int, body: dict) -> None:
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self._cors()
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        url = urlparse(self.path)
        if url.path == "/ping":
            self._json(200, {"ok": True, "version": VERSION})
            return
        if url.path == "/scrape-status":
            qs = parse_qs(url.query)
            job_id = (qs.get("id") or [None])[0]
            if not job_id:
                self._json(400, {"error": "missing id"})
                return
            with JOBS_LOCK:
                job = JOBS.get(job_id)
            if not job:
                self._json(404, {"error": "job not found"})
                return
            self._json(200, job)
            return
        if url.path == "/jobs":
            with JOBS_LOCK:
                items = sorted(
                    JOBS.values(), key=lambda j: j.get("startedAt", ""), reverse=True
                )[:20]
            self._json(200, {"jobs": items})
            return
        self._json(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        url = urlparse(self.path)
        if url.path != "/scrape":
            self._json(404, {"error": "not found"})
            return

        length = int(self.headers.get("Content-Length") or 0)
        body: dict = {}
        if length:
            try:
                body = json.loads(self.rfile.read(length))
            except json.JSONDecodeError:
                body = {}

        platforms = body.get("platforms") or PLATFORMS
        platforms = [p for p in platforms if p in PLATFORM_RUNNERS]
        if not platforms:
            self._json(400, {"error": "no valid platforms"})
            return

        job_id = uuid.uuid4().hex[:12]
        eta_seconds = STUB_SECONDS_PER_PLATFORM * len(platforms)
        job = {
            "id": job_id,
            "status": "queued",
            "platforms": platforms,
            "startedAt": now_iso(),
            "etaSeconds": eta_seconds,
            "currentPlatform": None,
            "progress": 0,
            "isStub": True,
        }
        with JOBS_LOCK:
            JOBS[job_id] = job

        threading.Thread(
            target=run_scrape, args=(job_id, platforms), daemon=True
        ).start()
        self._json(200, job)

    def log_message(self, format, *args):  # noqa: A002
        # Keep stdout calm.
        return


def main() -> None:
    print(f"FWP Scraper service v{VERSION} on http://localhost:{PORT}")
    print(f"  data dir: {DATA_DIR}")
    print(f"  STUB MODE: each platform sleeps {STUB_SECONDS_PER_PLATFORM}s")
    print("  endpoints: GET /ping  POST /scrape  GET /scrape-status?id=<jobId>")
    HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
