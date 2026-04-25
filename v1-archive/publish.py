#!/usr/bin/env python3
"""
Content Publisher for Finance With Phil Content Studio.
Uses Chrome CDP (port 9222) to automate posting to social platforms.

Usage:
    python3 publish.py --id content_abc123 --platform instagram
    python3 publish.py --id content_abc123 --platform tiktok --caption "Custom caption"
    python3 publish.py --id content_abc123 --platform all
"""

import argparse
import json
import sys
import time
import websocket
import urllib.request
from pathlib import Path

DIR = Path(__file__).parent
QUEUE_FILE = DIR / "data" / "content_queue.json"
CDP_HOST = "localhost"
CDP_PORT = 9222
MSG_ID = 0


def cdp_send(ws, method, params=None):
    """Send a CDP command and return the result."""
    global MSG_ID
    MSG_ID += 1
    msg = {"id": MSG_ID, "method": method, "params": params or {}}
    ws.send(json.dumps(msg))

    while True:
        resp = json.loads(ws.recv())
        if resp.get("id") == MSG_ID:
            if "error" in resp:
                raise Exception(f"CDP error: {resp['error']}")
            return resp.get("result", {})


def get_cdp_ws_url():
    """Get WebSocket URL for the first browser tab."""
    try:
        url = f"http://{CDP_HOST}:{CDP_PORT}/json"
        resp = urllib.request.urlopen(url, timeout=5)
        tabs = json.loads(resp.read())
        for tab in tabs:
            if tab.get("type") == "page":
                return tab["webSocketDebuggerUrl"]
        raise Exception("No page tab found")
    except Exception as e:
        print(f"Error connecting to Chrome CDP: {e}")
        print("Make sure Chrome is running with --remote-debugging-port=9222")
        sys.exit(1)


def wait_for_selector(ws, selector, timeout=30):
    """Wait for a DOM element to appear."""
    for _ in range(timeout * 2):
        result = cdp_send(ws, "Runtime.evaluate", {
            "expression": f"!!document.querySelector('{selector}')",
            "returnByValue": True
        })
        if result.get("result", {}).get("value"):
            return True
        time.sleep(0.5)
    return False


def evaluate(ws, expression):
    """Run JS in page context and return value."""
    result = cdp_send(ws, "Runtime.evaluate", {
        "expression": expression,
        "returnByValue": True,
        "awaitPromise": True
    })
    return result.get("result", {}).get("value")


def upload_file(ws, selector, filepath):
    """Upload a file to a file input element."""
    # Get the file input node
    doc = cdp_send(ws, "DOM.getDocument")
    node = cdp_send(ws, "DOM.querySelector", {
        "nodeId": doc["root"]["nodeId"],
        "selector": selector
    })
    if not node.get("nodeId"):
        # Try making hidden inputs visible
        evaluate(ws, f"""
            document.querySelectorAll('input[type="file"]').forEach(el => {{
                el.style.display = 'block';
                el.style.opacity = '1';
            }});
        """)
        node = cdp_send(ws, "DOM.querySelector", {
            "nodeId": doc["root"]["nodeId"],
            "selector": selector
        })

    cdp_send(ws, "DOM.setFileInputFiles", {
        "nodeId": node["nodeId"],
        "files": [str(filepath)]
    })


def publish_instagram(ws, filepath, caption):
    """Publish to Instagram via browser automation."""
    print("  Publishing to Instagram...")

    # Navigate to Instagram
    cdp_send(ws, "Page.navigate", {"url": "https://www.instagram.com/"})
    time.sleep(3)

    # Click the create/new post button (+)
    evaluate(ws, """
        // Look for the create button (SVG with "New post" aria-label or the + icon)
        const createBtn = document.querySelector('[aria-label="New post"]')
            || document.querySelector('[aria-label="New Post"]')
            || document.querySelector('svg[aria-label="New post"]')?.closest('a,div,button');
        if (createBtn) createBtn.click();
    """)
    time.sleep(2)

    # Look for file input and upload
    evaluate(ws, """
        document.querySelectorAll('input[type="file"]').forEach(el => {
            el.style.display = 'block';
            el.style.opacity = '1';
            el.style.position = 'fixed';
            el.style.top = '0';
            el.style.zIndex = '99999';
        });
    """)
    time.sleep(1)

    # Upload the file
    try:
        upload_file(ws, 'input[type="file"][accept*="video"]', filepath)
    except Exception:
        upload_file(ws, 'input[type="file"]', filepath)
    time.sleep(5)

    # Wait for processing, click through steps (crop -> filters -> caption)
    for _ in range(3):
        time.sleep(2)
        evaluate(ws, """
            const nextBtn = Array.from(document.querySelectorAll('button, div[role="button"]'))
                .find(el => el.textContent.trim() === 'Next');
            if (nextBtn) nextBtn.click();
        """)

    time.sleep(2)

    # Enter caption
    if caption:
        evaluate(ws, f"""
            const textarea = document.querySelector('textarea[aria-label="Write a caption..."]')
                || document.querySelector('[contenteditable="true"][role="textbox"]')
                || document.querySelector('[aria-label="Write a caption..."]');
            if (textarea) {{
                textarea.focus();
                textarea.value = {json.dumps(caption)};
                textarea.dispatchEvent(new Event('input', {{ bubbles: true }}));
            }}
        """)
        time.sleep(1)

    # Click Share
    evaluate(ws, """
        const shareBtn = Array.from(document.querySelectorAll('button, div[role="button"]'))
            .find(el => el.textContent.trim() === 'Share');
        if (shareBtn) shareBtn.click();
    """)

    time.sleep(5)
    print("  Instagram post submitted!")
    return {"platform": "instagram", "status": "posted"}


def publish_tiktok(ws, filepath, caption):
    """Publish to TikTok via browser automation."""
    print("  Publishing to TikTok...")

    cdp_send(ws, "Page.navigate", {"url": "https://www.tiktok.com/upload"})
    time.sleep(5)

    # Upload file
    evaluate(ws, """
        document.querySelectorAll('input[type="file"]').forEach(el => {
            el.style.display = 'block';
            el.style.opacity = '1';
        });
    """)
    time.sleep(1)

    try:
        upload_file(ws, 'input[type="file"][accept*="video"]', filepath)
    except Exception:
        upload_file(ws, 'input[type="file"]', filepath)

    time.sleep(8)  # TikTok processing takes longer

    # Enter caption/description
    if caption:
        evaluate(ws, f"""
            const editor = document.querySelector('[contenteditable="true"]')
                || document.querySelector('.public-DraftEditor-content');
            if (editor) {{
                editor.focus();
                editor.textContent = {json.dumps(caption)};
                editor.dispatchEvent(new Event('input', {{ bubbles: true }}));
            }}
        """)
        time.sleep(1)

    # Click Post button
    evaluate(ws, """
        const postBtn = Array.from(document.querySelectorAll('button'))
            .find(el => el.textContent.trim() === 'Post' && !el.disabled);
        if (postBtn) postBtn.click();
    """)

    time.sleep(5)
    print("  TikTok post submitted!")
    return {"platform": "tiktok", "status": "posted"}


def publish_youtube(ws, filepath, caption):
    """Publish to YouTube via Studio."""
    print("  Publishing to YouTube...")

    cdp_send(ws, "Page.navigate", {"url": "https://studio.youtube.com"})
    time.sleep(5)

    # Click Create -> Upload videos
    evaluate(ws, """
        const createBtn = document.querySelector('#create-icon')
            || document.querySelector('[aria-label="Create"]');
        if (createBtn) createBtn.click();
    """)
    time.sleep(2)

    evaluate(ws, """
        const uploadItem = Array.from(document.querySelectorAll('tp-yt-paper-item, ytcp-text-menu-item'))
            .find(el => el.textContent.includes('Upload video'));
        if (uploadItem) uploadItem.click();
    """)
    time.sleep(3)

    # Upload file
    evaluate(ws, """
        document.querySelectorAll('input[type="file"]').forEach(el => {
            el.style.display = 'block';
        });
    """)
    time.sleep(1)

    upload_file(ws, 'input[type="file"]', filepath)
    time.sleep(8)

    # Fill title and description
    if caption:
        # Split caption: first line = title, rest = description
        lines = caption.split("\n", 1)
        title = lines[0][:100]
        description = lines[1] if len(lines) > 1 else ""

        evaluate(ws, f"""
            // Title
            const titleInput = document.querySelector('#textbox[aria-label="Add a title that describes your video (type @ to mention a channel)"]')
                || document.querySelector('#title-textarea #textbox');
            if (titleInput) {{
                titleInput.textContent = {json.dumps(title)};
                titleInput.dispatchEvent(new Event('input', {{ bubbles: true }}));
            }}
        """)
        time.sleep(1)

        if description:
            evaluate(ws, f"""
                const descInput = document.querySelector('#description-textarea #textbox')
                    || document.querySelector('[aria-label="Tell viewers about your video (type @ to mention a channel)"]');
                if (descInput) {{
                    descInput.textContent = {json.dumps(description)};
                    descInput.dispatchEvent(new Event('input', {{ bubbles: true }}));
                }}
            """)
        time.sleep(1)

    # Set as Short (if vertical/short duration) — select "Not made for kids"
    evaluate(ws, """
        const notForKids = document.querySelector('#audience [name="NOT_MADE_FOR_KIDS"]')
            || document.querySelector('tp-yt-paper-radio-button[name="NOT_MADE_FOR_KIDS"]');
        if (notForKids) notForKids.click();
    """)
    time.sleep(1)

    # Click through to Visibility (Next -> Next -> Next)
    for _ in range(3):
        evaluate(ws, """
            const nextBtn = document.querySelector('#next-button')
                || document.querySelector('[aria-label="Next"]');
            if (nextBtn) nextBtn.click();
        """)
        time.sleep(2)

    # Set Public visibility
    evaluate(ws, """
        const publicRadio = document.querySelector('#privacy-radios tp-yt-paper-radio-button[name="PUBLIC"]')
            || document.querySelector('[name="PUBLIC"]');
        if (publicRadio) publicRadio.click();
    """)
    time.sleep(1)

    # Click Publish
    evaluate(ws, """
        const publishBtn = document.querySelector('#done-button')
            || document.querySelector('[aria-label="Publish"]');
        if (publishBtn) publishBtn.click();
    """)

    time.sleep(5)
    print("  YouTube video submitted!")
    return {"platform": "youtube", "status": "posted"}


def publish_threads(ws, filepath, caption):
    """Publish to Threads via browser automation."""
    print("  Publishing to Threads...")

    cdp_send(ws, "Page.navigate", {"url": "https://www.threads.net/"})
    time.sleep(4)

    # Click compose
    evaluate(ws, """
        const composeBtn = document.querySelector('[aria-label="Create"]')
            || document.querySelector('[aria-label="New thread"]');
        if (composeBtn) composeBtn.click();
    """)
    time.sleep(2)

    # Enter text
    if caption:
        evaluate(ws, f"""
            const editor = document.querySelector('[contenteditable="true"][role="textbox"]')
                || document.querySelector('[data-text="true"]')?.closest('[contenteditable]');
            if (editor) {{
                editor.focus();
                editor.textContent = {json.dumps(caption)};
                editor.dispatchEvent(new Event('input', {{ bubbles: true }}));
            }}
        """)
        time.sleep(1)

    # Attach media
    evaluate(ws, """
        document.querySelectorAll('input[type="file"]').forEach(el => {
            el.style.display = 'block';
            el.style.opacity = '1';
        });
    """)
    time.sleep(1)

    try:
        upload_file(ws, 'input[type="file"][accept*="video"]', filepath)
    except Exception:
        upload_file(ws, 'input[type="file"]', filepath)

    time.sleep(5)

    # Click Post
    evaluate(ws, """
        const postBtn = Array.from(document.querySelectorAll('div[role="button"]'))
            .find(el => el.textContent.trim() === 'Post');
        if (postBtn) postBtn.click();
    """)

    time.sleep(5)
    print("  Threads post submitted!")
    return {"platform": "threads", "status": "posted"}


PLATFORM_HANDLERS = {
    "instagram": publish_instagram,
    "tiktok": publish_tiktok,
    "youtube": publish_youtube,
    "threads": publish_threads,
}


def main():
    parser = argparse.ArgumentParser(description="Publish content to social platforms via CDP")
    parser.add_argument("--id", required=True, help="Content ID from content_queue.json")
    parser.add_argument("--platform", required=True,
                        choices=["instagram", "tiktok", "youtube", "threads", "all"],
                        help="Platform to post to")
    parser.add_argument("--caption", help="Override caption (otherwise uses stored caption)")
    parser.add_argument("--delay", type=int, default=60,
                        help="Delay between platforms in seconds (default: 60)")
    args = parser.parse_args()

    # Load queue
    with open(QUEUE_FILE) as f:
        queue = json.load(f)

    # Find content entry
    entry = None
    for item in queue:
        if item["id"] == args.id:
            entry = item
            break

    if not entry:
        print(f"Error: Content ID '{args.id}' not found in queue")
        sys.exit(1)

    filepath = entry["path"]
    if not Path(filepath).exists():
        print(f"Error: Video file not found: {filepath}")
        sys.exit(1)

    # Determine platforms
    platforms = list(PLATFORM_HANDLERS.keys()) if args.platform == "all" else [args.platform]

    # Connect to Chrome
    ws_url = get_cdp_ws_url()
    ws = websocket.create_connection(ws_url, timeout=30)
    cdp_send(ws, "Page.enable")
    cdp_send(ws, "DOM.enable")
    cdp_send(ws, "Runtime.enable")

    results = {}
    for i, platform in enumerate(platforms):
        caption = args.caption or entry["captions"].get(platform, "")

        try:
            result = PLATFORM_HANDLERS[platform](ws, filepath, caption)
            results[platform] = result

            # Update queue entry
            from datetime import datetime
            if "postedTo" not in entry:
                entry["postedTo"] = {}
            entry["postedTo"][platform] = {
                "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "status": "posted"
            }

        except Exception as e:
            print(f"  Error posting to {platform}: {e}")
            results[platform] = {"platform": platform, "status": "error", "error": str(e)}

        # Delay between platforms
        if i < len(platforms) - 1:
            print(f"  Waiting {args.delay}s before next platform...")
            time.sleep(args.delay)

    # Update status
    all_posted = all(r.get("status") == "posted" for r in results.values())
    if all_posted and len(results) > 0:
        entry["status"] = "posted"
    elif any(r.get("status") == "posted" for r in results.values()):
        entry["status"] = "partial"

    # Save queue
    with open(QUEUE_FILE, "w") as f:
        json.dump(queue, f, indent=2)

    ws.close()
    print(f"\nPublish complete: {json.dumps(results, indent=2)}")


if __name__ == "__main__":
    main()
