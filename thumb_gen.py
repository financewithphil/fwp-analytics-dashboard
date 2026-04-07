#!/usr/bin/env python3
"""
Generate AI thumbnail backgrounds via Higgsfield (Chrome CDP automation).

Usage:
    python3 thumb_gen.py "cinematic dark finance background" --ratio 16:9
    python3 thumb_gen.py "money stacks neon glow" --ratio 1:1
    python3 thumb_gen.py "investment chart abstract" --ratio 9:16

Outputs images to data/frames/ai_backgrounds/ and writes status to status.json.
"""

import asyncio
import json
import os
import sys
import time
import argparse
import re
import urllib.request
from pathlib import Path

# Add cdp-helper to path
sys.path.insert(0, str(Path.home() / ".chrome-automation"))
from importlib import import_module

DIR = Path(__file__).parent
BG_DIR = DIR / "data" / "frames" / "ai_backgrounds"
STATUS_FILE = BG_DIR / "status.json"
HIGGSFIELD_URL = "https://higgsfield.ai/image/nano_banana_2"

# Aspect ratio map matching Higgsfield's options
RATIO_MAP = {
    "16:9": "16:9",
    "1:1": "1:1",
    "9:16": "9:16",
    "4:3": "4:3",
    "3:4": "3:4",
}


def write_status(job_id, status, **kwargs):
    try:
        with open(STATUS_FILE) as f:
            statuses = json.load(f)
    except Exception:
        statuses = {}
    statuses[job_id] = {"status": status, "updated": time.time(), **kwargs}
    with open(STATUS_FILE, "w") as f:
        json.dump(statuses, f, indent=2)


async def generate(prompt, ratio="16:9", job_id=None):
    """Automate Higgsfield via CDP to generate a background image."""
    # Import CDP helper functions
    cdp_helper = sys.modules.get("cdp_helper")
    if not cdp_helper:
        # Manual import from path
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "cdp_helper", str(Path.home() / ".chrome-automation" / "cdp-helper.py")
        )
        cdp_helper = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cdp_helper)

    if not job_id:
        job_id = f"bg_{int(time.time())}"

    write_status(job_id, "connecting")
    print(f"[thumb_gen] Job {job_id}: connecting to CDP...")

    ws_url = await cdp_helper.get_ws_url()
    if not ws_url:
        write_status(job_id, "error", error="No Chrome CDP target found")
        print("[thumb_gen] ERROR: No CDP target. Run ~/.chrome-automation/launch.sh")
        return None

    import websockets
    async with websockets.connect(ws_url, max_size=50_000_000) as ws:
        # Navigate to Higgsfield
        write_status(job_id, "navigating")
        print("[thumb_gen] Navigating to Higgsfield...")
        current_url = await cdp_helper.send_cdp(ws, "Runtime.evaluate",
            {"expression": "window.location.href"})
        current = current_url.get("result", {}).get("result", {}).get("value", "")

        if "higgsfield.ai/image" not in current:
            await cdp_helper.navigate(ws, HIGGSFIELD_URL, wait=4)

        # Wait for page to be ready
        await asyncio.sleep(2)

        # Set aspect ratio
        write_status(job_id, "configuring")
        hf_ratio = RATIO_MAP.get(ratio, "16:9")
        print(f"[thumb_gen] Setting aspect ratio to {hf_ratio}...")

        # Click the aspect ratio button to open dropdown
        await cdp_helper.send_cdp(ws, "Runtime.evaluate", {"expression": f"""
            (function() {{
                // Find and click the aspect ratio button
                const buttons = document.querySelectorAll('button');
                for (const btn of buttons) {{
                    const text = btn.textContent.trim();
                    if (/^\\d+:\\d+$/.test(text) || text === 'Auto') {{
                        btn.click();
                        return 'clicked ratio button: ' + text;
                    }}
                }}
                return 'ratio button not found';
            }})()
        """})
        await asyncio.sleep(0.8)

        # Select the desired ratio from the dropdown
        await cdp_helper.send_cdp(ws, "Runtime.evaluate", {"expression": f"""
            (function() {{
                const options = document.querySelectorAll('[role="option"]');
                for (const opt of options) {{
                    if (opt.textContent.trim() === '{hf_ratio}' || opt.getAttribute('value') === '{hf_ratio}') {{
                        opt.click();
                        return 'selected ' + '{hf_ratio}';
                    }}
                }}
                // Try clicking dismiss if ratio already set
                const dismiss = document.querySelector('button[class*="Dismiss"]');
                if (dismiss) dismiss.click();
                return 'ratio option not found';
            }})()
        """})
        await asyncio.sleep(0.5)

        # Clear and set prompt
        write_status(job_id, "prompting")
        print(f"[thumb_gen] Setting prompt: {prompt[:80]}...")

        await cdp_helper.send_cdp(ws, "Runtime.evaluate", {"expression": """
            (function() {
                const el = document.querySelector('[contenteditable="true"]');
                if (el) {
                    el.focus();
                    const sel = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(el);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    document.execCommand('delete');
                    return 'cleared';
                }
                return 'not found';
            })()
        """})
        await asyncio.sleep(0.3)

        # Type the prompt
        await cdp_helper.send_cdp(ws, "Input.insertText", {"text": prompt})
        await asyncio.sleep(0.5)

        # Count existing images before generating
        count_result = await cdp_helper.send_cdp(ws, "Runtime.evaluate", {"expression": """
            document.querySelectorAll('img[alt="image generation"]').length
        """})
        before_count = count_result.get("result", {}).get("result", {}).get("value", 0)

        # Click Generate
        write_status(job_id, "generating")
        print("[thumb_gen] Clicking Generate...")
        await cdp_helper.send_cdp(ws, "Runtime.evaluate", {"expression": """
            (function() {
                const buttons = document.querySelectorAll('button');
                for (const btn of buttons) {
                    if (btn.textContent.includes('Generate')) {
                        btn.click();
                        return 'clicked generate';
                    }
                }
                return 'generate button not found';
            })()
        """})

        # Poll for completion (new images appearing)
        print("[thumb_gen] Waiting for generation (up to 90s)...")
        max_wait = 90
        poll_interval = 3
        elapsed = 0

        while elapsed < max_wait:
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval

            # Check if new images appeared and no more "Processing"/"Queued" labels
            check = await cdp_helper.send_cdp(ws, "Runtime.evaluate", {"expression": f"""
                (function() {{
                    const imgs = document.querySelectorAll('img[alt="image generation"]');
                    const processing = document.querySelectorAll('*');
                    let pendingCount = 0;
                    for (const el of processing) {{
                        const t = el.textContent.trim();
                        if (t === 'Processing' || t === 'Queued' || t === 'Generating') pendingCount++;
                    }}
                    return JSON.stringify({{
                        imageCount: imgs.length,
                        pending: pendingCount > 3,
                        firstNewSrc: imgs.length > {before_count} ? imgs[0].src : null
                    }});
                }})()
            """})

            try:
                state = json.loads(check.get("result", {}).get("result", {}).get("value", "{}"))
            except Exception:
                continue

            print(f"[thumb_gen]   {elapsed}s — images: {state.get('imageCount')}, pending: {state.get('pending')}")

            if state.get("imageCount", 0) > before_count and not state.get("pending"):
                print("[thumb_gen] Generation complete!")
                break
        else:
            write_status(job_id, "timeout", error="Generation timed out after 90s")
            print("[thumb_gen] TIMEOUT: Generation took too long")
            return None

        # Extract image URLs (get the newest ones)
        await asyncio.sleep(1)
        urls_result = await cdp_helper.send_cdp(ws, "Runtime.evaluate", {"expression": f"""
            (function() {{
                const imgs = document.querySelectorAll('img[alt="image generation"]');
                const urls = [];
                const newCount = imgs.length - {before_count};
                for (let i = 0; i < Math.min(newCount, 4); i++) {{
                    urls.push(imgs[i].src);
                }}
                return JSON.stringify(urls);
            }})()
        """})

        try:
            image_urls = json.loads(urls_result.get("result", {}).get("result", {}).get("value", "[]"))
        except Exception:
            image_urls = []

        if not image_urls:
            write_status(job_id, "error", error="No images found after generation")
            print("[thumb_gen] ERROR: No images found")
            return None

        # Download images
        write_status(job_id, "downloading")
        downloaded = []
        for i, url in enumerate(image_urls):
            # Extract full-res URL from the proxy wrapper
            # From: https://images.higgs.ai/?...url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2F...webp&w=640&q=85
            # To: https://d8j0ntlcm91z4.cloudfront.net/...webp (without _min)
            full_url = url
            if "images.higgs.ai" in url:
                # Extract the encoded URL param
                match = re.search(r'url=([^&]+)', url)
                if match:
                    from urllib.parse import unquote
                    decoded = unquote(match.group(1))
                    # Remove _min suffix for full resolution
                    full_url = decoded.replace("_min.webp", ".webp")

            filename = f"{job_id}_{i}.webp"
            filepath = BG_DIR / filename
            print(f"[thumb_gen] Downloading image {i+1}/{len(image_urls)}: {filename}")

            try:
                size = await cdp_helper.download_file(full_url, str(filepath))
                downloaded.append({
                    "file": filename,
                    "path": f"ai_backgrounds/{filename}",
                    "url": f"/frame/ai_backgrounds/{filename}",
                    "size": size,
                    "source_url": full_url
                })
                print(f"[thumb_gen]   Saved: {filepath} ({size/1024:.0f} KB)")
            except Exception as e:
                print(f"[thumb_gen]   Failed to download: {e}")
                # Try downloading the proxy URL instead
                try:
                    size = await cdp_helper.download_file(url, str(filepath))
                    downloaded.append({
                        "file": filename,
                        "path": f"ai_backgrounds/{filename}",
                        "url": f"/frame/ai_backgrounds/{filename}",
                        "size": size,
                        "source_url": url
                    })
                    print(f"[thumb_gen]   Saved (proxy): {filepath} ({size/1024:.0f} KB)")
                except Exception as e2:
                    print(f"[thumb_gen]   Also failed with proxy URL: {e2}")

        if downloaded:
            write_status(job_id, "completed", images=downloaded, prompt=prompt, ratio=ratio)
            print(f"[thumb_gen] Done! {len(downloaded)} images saved to {BG_DIR}")
            return downloaded
        else:
            write_status(job_id, "error", error="Failed to download any images")
            print("[thumb_gen] ERROR: No images downloaded")
            return None


def main():
    parser = argparse.ArgumentParser(description="Generate AI thumbnail backgrounds via Higgsfield")
    parser.add_argument("prompt", help="Image generation prompt")
    parser.add_argument("--ratio", default="16:9", choices=list(RATIO_MAP.keys()),
                        help="Aspect ratio (default: 16:9)")
    parser.add_argument("--job-id", default=None, help="Custom job ID")
    args = parser.parse_args()

    BG_DIR.mkdir(parents=True, exist_ok=True)
    result = asyncio.run(generate(args.prompt, args.ratio, args.job_id))

    if result:
        print(f"\nSuccess! Generated {len(result)} backgrounds:")
        for img in result:
            print(f"  {img['file']} — {img['size']/1024:.0f} KB")
    else:
        print("\nFailed to generate backgrounds.")
        sys.exit(1)


if __name__ == "__main__":
    main()
