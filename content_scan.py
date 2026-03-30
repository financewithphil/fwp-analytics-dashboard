#!/usr/bin/env python3
"""
Content Scanner for Finance With Phil Content Studio.
Scans a folder of video files, extracts metadata and thumbnails,
and writes to data/content_queue.json.

Usage:
    python3 content_scan.py                          # Scans ~/Content Studio/
    python3 content_scan.py --folder /path/to/videos # Scans custom folder
    python3 content_scan.py --folder ~/Dropbox/Videos
"""

import argparse
import base64
import hashlib
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

DIR = Path(__file__).parent
QUEUE_FILE = DIR / "data" / "content_queue.json"
FRAMES_DIR = DIR / "data" / "frames"
DEFAULT_FOLDER = Path.home() / "Content Studio"
VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"}


def get_video_metadata(filepath):
    """Extract duration, resolution, codec, filesize via ffprobe."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet", "-print_format", "json",
                "-show_format", "-show_streams", str(filepath)
            ],
            capture_output=True, text=True, timeout=30
        )
        data = json.loads(result.stdout)

        # Find video stream
        video_stream = None
        for s in data.get("streams", []):
            if s.get("codec_type") == "video":
                video_stream = s
                break

        fmt = data.get("format", {})
        duration_secs = float(fmt.get("duration", 0))
        file_size = int(fmt.get("size", 0))

        width = int(video_stream.get("width", 0)) if video_stream else 0
        height = int(video_stream.get("height", 0)) if video_stream else 0
        codec = video_stream.get("codec_name", "unknown") if video_stream else "unknown"

        # Format duration as M:SS
        mins = int(duration_secs // 60)
        secs = int(duration_secs % 60)
        duration_str = f"{mins}:{secs:02d}"

        # Format file size
        if file_size > 1_000_000_000:
            size_str = f"{file_size / 1_000_000_000:.1f} GB"
        elif file_size > 1_000_000:
            size_str = f"{file_size / 1_000_000:.1f} MB"
        elif file_size > 1_000:
            size_str = f"{file_size / 1_000:.1f} KB"
        else:
            size_str = f"{file_size} B"

        return {
            "durationSecs": duration_secs,
            "duration": duration_str,
            "resolution": f"{width}x{height}",
            "codec": codec,
            "fileSize": size_str,
            "fileSizeBytes": file_size,
            "width": width,
            "height": height,
        }
    except Exception as e:
        print(f"  Warning: ffprobe failed for {filepath}: {e}")
        return {
            "durationSecs": 0, "duration": "0:00", "resolution": "unknown",
            "codec": "unknown", "fileSize": "unknown", "fileSizeBytes": 0,
            "width": 0, "height": 0,
        }


def generate_thumbnail(filepath, content_id, duration_secs):
    """Generate thumbnail (base64) and key frames for a video."""
    frames_dir = FRAMES_DIR / content_id
    frames_dir.mkdir(parents=True, exist_ok=True)

    # Generate 4 frames: 0.5s, and 3 evenly spaced
    offsets = [0.5]
    if duration_secs > 2:
        step = duration_secs / 4
        offsets += [step, step * 2, step * 3]
    else:
        offsets += [max(0.1, duration_secs * 0.25),
                    max(0.2, duration_secs * 0.5),
                    max(0.3, duration_secs * 0.75)]

    thumbnail_b64 = None

    for i, offset in enumerate(offsets):
        frame_path = frames_dir / f"frame_{i:02d}.jpg"
        try:
            subprocess.run(
                [
                    "ffmpeg", "-y", "-ss", str(offset), "-i", str(filepath),
                    "-vframes", "1", "-vf", "scale=320:-1",
                    "-q:v", "3", str(frame_path)
                ],
                capture_output=True, timeout=15
            )

            # Use first frame as thumbnail (base64)
            if i == 0 and frame_path.exists():
                with open(frame_path, "rb") as f:
                    thumbnail_b64 = base64.b64encode(f.read()).decode("utf-8")

        except Exception as e:
            print(f"  Warning: frame extraction failed at {offset}s: {e}")

    # Also extract hook frames (0s, 1s, 2s, 3s) for analysis
    for sec in range(min(4, int(duration_secs) + 1)):
        hook_path = frames_dir / f"hook_{sec:02d}.jpg"
        try:
            subprocess.run(
                [
                    "ffmpeg", "-y", "-ss", str(sec), "-i", str(filepath),
                    "-vframes", "1", "-vf", "scale=640:-1",
                    "-q:v", "2", str(hook_path)
                ],
                capture_output=True, timeout=15
            )
        except Exception:
            pass

    return thumbnail_b64


def generate_content_id(filepath):
    """Generate a stable ID from filepath."""
    path_hash = hashlib.md5(str(filepath).encode()).hexdigest()[:8]
    return f"content_{path_hash}"


def scan_folder(folder_path):
    """Scan folder for video files and return metadata list."""
    folder = Path(folder_path)
    if not folder.exists():
        print(f"Error: Folder does not exist: {folder}")
        sys.exit(1)

    # Load existing queue
    if QUEUE_FILE.exists():
        with open(QUEUE_FILE) as f:
            queue = json.load(f)
    else:
        queue = []

    existing_paths = {item.get("path") for item in queue}
    new_count = 0

    # Find all video files
    video_files = []
    for root, dirs, files in os.walk(folder):
        for fname in sorted(files):
            if Path(fname).suffix.lower() in VIDEO_EXTENSIONS:
                video_files.append(Path(root) / fname)

    print(f"Found {len(video_files)} video files in {folder}")

    for filepath in video_files:
        abs_path = str(filepath.resolve())

        if abs_path in existing_paths:
            continue

        content_id = generate_content_id(filepath)

        # Check if ID already exists (collision)
        existing_ids = {item.get("id") for item in queue}
        if content_id in existing_ids:
            continue

        print(f"  Scanning: {filepath.name}")

        # Get metadata
        meta = get_video_metadata(filepath)

        # Generate thumbnails
        print(f"  Extracting frames...")
        thumbnail = generate_thumbnail(filepath, content_id, meta["durationSecs"])

        entry = {
            "id": content_id,
            "filename": filepath.name,
            "path": abs_path,
            "folder": str(filepath.parent),
            "addedDate": datetime.now().strftime("%Y-%m-%d"),
            "status": "inbox",
            "duration": meta["duration"],
            "durationSecs": meta["durationSecs"],
            "resolution": meta["resolution"],
            "codec": meta["codec"],
            "fileSize": meta["fileSize"],
            "fileSizeBytes": meta["fileSizeBytes"],
            "thumbnail": thumbnail,
            "analysis": None,
            "captions": {
                "instagram": "",
                "tiktok": "",
                "youtube": "",
                "threads": ""
            },
            "platforms": [],
            "postedTo": {}
        }

        queue.append(entry)
        new_count += 1

    # Sort by added date (newest first)
    queue.sort(key=lambda x: x.get("addedDate", ""), reverse=True)

    # Save
    with open(QUEUE_FILE, "w") as f:
        json.dump(queue, f, indent=2)

    print(f"\nDone! {new_count} new videos added. Total in queue: {len(queue)}")
    print(f"Queue saved to: {QUEUE_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scan folder for video content")
    parser.add_argument("--folder", default=str(DEFAULT_FOLDER),
                        help=f"Folder to scan (default: {DEFAULT_FOLDER})")
    args = parser.parse_args()
    scan_folder(args.folder)
