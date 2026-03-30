#!/usr/bin/env python3
"""
Local API server for Content Studio.
Bridges the static dashboard with local scripts (scan, analyze, publish).

Usage:
    python3 studio_server.py                    # Default port 5555
    python3 studio_server.py --port 8888        # Custom port

The dashboard auto-detects this server on load.
"""

import argparse
import json
import subprocess
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs

DIR = Path(__file__).parent
QUEUE_FILE = DIR / "data" / "content_queue.json"
ANALYSIS_FILE = DIR / "data" / "content_analysis.json"
PORT = 5555


class StudioHandler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json_response(self, data, status=200):
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path

        if path == "/health":
            self._json_response({"status": "ok", "server": "content-studio"})

        elif path == "/queue":
            with open(QUEUE_FILE) as f:
                self._json_response(json.load(f))

        elif path == "/analysis":
            with open(ANALYSIS_FILE) as f:
                self._json_response(json.load(f))

        else:
            self._json_response({"error": "not found"}, 404)

    def do_POST(self):
        path = urlparse(self.path).path
        content_len = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(content_len)) if content_len else {}

        if path == "/scan":
            folder = body.get("folder", str(Path.home() / "Content Studio"))
            result = subprocess.run(
                [sys.executable, str(DIR / "content_scan.py"), "--folder", folder],
                capture_output=True, text=True, timeout=300
            )
            with open(QUEUE_FILE) as f:
                queue = json.load(f)
            self._json_response({
                "output": result.stdout,
                "errors": result.stderr,
                "queue": queue
            })

        elif path == "/publish":
            content_id = body.get("id")
            platform = body.get("platform", "all")
            caption = body.get("caption", "")

            cmd = [sys.executable, str(DIR / "publish.py"),
                   "--id", content_id, "--platform", platform]
            if caption:
                cmd += ["--caption", caption]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            with open(QUEUE_FILE) as f:
                queue = json.load(f)
            self._json_response({
                "output": result.stdout,
                "errors": result.stderr,
                "queue": queue
            })

        elif path == "/update":
            # Update a content entry (status, captions, platforms, analysis)
            content_id = body.get("id")
            updates = body.get("updates", {})

            with open(QUEUE_FILE) as f:
                queue = json.load(f)

            for item in queue:
                if item["id"] == content_id:
                    for key, val in updates.items():
                        if key == "captions":
                            item.setdefault("captions", {}).update(val)
                        elif key == "analysis":
                            item["analysis"] = val
                        else:
                            item[key] = val
                    break

            with open(QUEUE_FILE, "w") as f:
                json.dump(queue, f, indent=2)

            self._json_response({"status": "updated", "queue": queue})

        elif path == "/delete":
            content_id = body.get("id")
            with open(QUEUE_FILE) as f:
                queue = json.load(f)
            queue = [item for item in queue if item["id"] != content_id]
            with open(QUEUE_FILE, "w") as f:
                json.dump(queue, f, indent=2)
            self._json_response({"status": "deleted", "queue": queue})

        else:
            self._json_response({"error": "not found"}, 404)

    def log_message(self, format, *args):
        print(f"[Studio] {args[0]}")


def main():
    parser = argparse.ArgumentParser(description="Content Studio local API server")
    parser.add_argument("--port", type=int, default=PORT)
    args = parser.parse_args()

    server = HTTPServer(("127.0.0.1", args.port), StudioHandler)
    print(f"Content Studio server running on http://localhost:{args.port}")
    print(f"Content folder: ~/Content Studio/")
    print(f"Queue file: {QUEUE_FILE}")
    print("Press Ctrl+C to stop\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")


if __name__ == "__main__":
    main()
