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
import os
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

        elif path.startswith("/export-file/"):
            # Serve exported story files for download
            rel_path = path.split("/export-file/", 1)[1]
            file_path = DIR / "data" / "exports" / rel_path
            if not file_path.exists():
                self._json_response({"error": "file not found"}, 404)
                return
            file_size = os.path.getsize(file_path)
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Content-Length", str(file_size))
            self.send_header("Content-Disposition", f'attachment; filename="{file_path.name}"')
            self.end_headers()
            with open(file_path, "rb") as f:
                while chunk := f.read(65536):
                    self.wfile.write(chunk)

        elif path.startswith("/video/"):
            # Serve video file by content ID
            content_id = path.split("/video/", 1)[1]
            with open(QUEUE_FILE) as f:
                queue = json.load(f)
            entry = next((i for i in queue if i["id"] == content_id), None)
            if not entry or not os.path.exists(entry["path"]):
                self._json_response({"error": "video not found"}, 404)
                return

            filepath = entry["path"]
            file_size = os.path.getsize(filepath)
            content_type = "video/mp4"
            if filepath.endswith(".mov"):
                content_type = "video/quicktime"
            elif filepath.endswith(".webm"):
                content_type = "video/webm"

            # Support range requests for video seeking
            range_header = self.headers.get("Range")
            if range_header:
                byte_range = range_header.strip().split("=")[1]
                start, end = byte_range.split("-")
                start = int(start)
                end = int(end) if end else file_size - 1
                length = end - start + 1

                self.send_response(206)
                self._cors()
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
                self.send_header("Content-Length", str(length))
                self.send_header("Accept-Ranges", "bytes")
                self.end_headers()

                with open(filepath, "rb") as f:
                    f.seek(start)
                    self.wfile.write(f.read(length))
            else:
                self.send_response(200)
                self._cors()
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(file_size))
                self.send_header("Accept-Ranges", "bytes")
                self.end_headers()

                with open(filepath, "rb") as f:
                    while chunk := f.read(65536):
                        self.wfile.write(chunk)

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

        elif path == "/download-convert":
            content_id = body.get("id")
            ratio = body.get("ratio", "9:16")
            target_w = body.get("width", 1080)
            target_h = body.get("height", 1920)

            with open(QUEUE_FILE) as f:
                queue = json.load(f)
            entry = next((i for i in queue if i["id"] == content_id), None)
            if not entry:
                self._json_response({"error": "content not found"}, 404)
                return

            filepath = entry["path"]
            if not os.path.exists(filepath):
                self._json_response({"error": "video file not found"}, 404)
                return

            export_dir = DIR / "data" / "exports" / content_id
            export_dir.mkdir(parents=True, exist_ok=True)

            src_w = entry.get("width", 0) or 1920
            src_h = entry.get("height", 0) or 1080
            ratio_tag = ratio.replace(":", "x")
            out_file = export_dir / f"{Path(filepath).stem}_{ratio_tag}_{target_w}x{target_h}.mp4"

            # Build smart crop/scale filter
            src_aspect = src_w / src_h if src_h else 1
            tgt_aspect = target_w / target_h if target_h else 1

            if abs(src_aspect - tgt_aspect) < 0.05:
                # Same aspect — just scale
                vf = f"scale={target_w}:{target_h}"
            elif src_aspect > tgt_aspect:
                # Source is wider — crop sides
                vf = f"crop=ih*{target_w}/{target_h}:ih,scale={target_w}:{target_h}"
            else:
                # Source is taller — crop top/bottom
                vf = f"crop=iw:iw*{target_h}/{target_w},scale={target_w}:{target_h}"

            cmd = [
                "ffmpeg", "-y", "-i", filepath,
                "-vf", vf,
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart",
                str(out_file)
            ]

            result = subprocess.run(cmd, capture_output=True, timeout=600)
            if out_file.exists():
                rel_path = f"/export-file/{content_id}/{out_file.name}"
                self._json_response({
                    "status": "converted",
                    "file": rel_path,
                    "ratio": ratio,
                    "resolution": f"{target_w}x{target_h}",
                    "size": f"{os.path.getsize(out_file) / 1_000_000:.1f} MB"
                })
            else:
                self._json_response({
                    "error": "conversion failed",
                    "stderr": result.stderr.decode()[-500:]
                }, 500)

        elif path == "/export-story":
            content_id = body.get("id")
            platforms = body.get("platforms", ["instagram", "tiktok", "youtube"])

            with open(QUEUE_FILE) as f:
                queue = json.load(f)
            entry = next((i for i in queue if i["id"] == content_id), None)
            if not entry:
                self._json_response({"error": "content not found"}, 404)
                return

            filepath = entry["path"]
            if not os.path.exists(filepath):
                self._json_response({"error": "video file not found"}, 404)
                return

            export_dir = DIR / "data" / "exports" / content_id
            export_dir.mkdir(parents=True, exist_ok=True)

            # Platform story limits (max seconds per segment)
            STORY_LIMITS = {
                "instagram": 60,
                "tiktok": 60,
                "youtube": 180,
                "facebook": 20,
            }

            duration = entry.get("durationSecs", 0)
            width = entry.get("width", 0) or 1920
            height = entry.get("height", 0) or 1080
            is_landscape = width > height

            # Build ffmpeg filter for 9:16 conversion
            if is_landscape:
                # Landscape → portrait: crop center, scale to 1080x1920
                vf = "crop=ih*9/16:ih,scale=1080:1920"
            else:
                # Already portrait: just scale
                vf = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black"

            results = {}
            for plat in platforms:
                max_seg = STORY_LIMITS.get(plat, 60)
                plat_dir = export_dir / plat
                plat_dir.mkdir(exist_ok=True)

                if duration <= max_seg:
                    # Single file, no split needed
                    out_file = plat_dir / f"story_{plat}.mp4"
                    cmd = [
                        "ffmpeg", "-y", "-i", filepath,
                        "-vf", vf,
                        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                        "-c:a", "aac", "-b:a", "128k",
                        "-movflags", "+faststart",
                        str(out_file)
                    ]
                    subprocess.run(cmd, capture_output=True, timeout=300)
                    results[plat] = {
                        "segments": 1,
                        "files": [f"/export-file/{content_id}/{plat}/story_{plat}.mp4"],
                        "maxPerSegment": max_seg,
                        "duration": round(duration, 1)
                    }
                else:
                    # Split into segments
                    num_segments = -(-int(duration) // max_seg)  # ceil division
                    files = []
                    for seg in range(num_segments):
                        start = seg * max_seg
                        seg_dur = min(max_seg, duration - start)
                        out_file = plat_dir / f"story_{plat}_part{seg+1}.mp4"
                        cmd = [
                            "ffmpeg", "-y", "-ss", str(start), "-i", filepath,
                            "-t", str(seg_dur),
                            "-vf", vf,
                            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                            "-c:a", "aac", "-b:a", "128k",
                            "-movflags", "+faststart",
                            str(out_file)
                        ]
                        subprocess.run(cmd, capture_output=True, timeout=300)
                        files.append(f"/export-file/{content_id}/{plat}/story_{plat}_part{seg+1}.mp4")
                    results[plat] = {
                        "segments": num_segments,
                        "files": files,
                        "maxPerSegment": max_seg,
                        "duration": round(duration, 1)
                    }

            self._json_response({"status": "exported", "exports": results})

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
