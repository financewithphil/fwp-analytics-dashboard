"""
Minimal Chrome DevTools Protocol client.

Connects to Chrome on a debugging port (default 9222), navigates a tab to
the desired origin (so cookies + auth headers flow naturally), and runs
JavaScript via Runtime.evaluate to capture API responses.

Usage:
    cdp = CDP()
    tab = cdp.open_tab("https://www.instagram.com/phillip.karaya/")
    cdp.attach(tab)
    cdp.wait_for_load(timeout=15)
    data = cdp.evaluate("fetch('/api/v1/...').then(r=>r.json())", await_promise=True)
    cdp.detach()
"""

from __future__ import annotations

import json
import time
import urllib.request
from dataclasses import dataclass
from typing import Any, Optional

import websocket  # pip install websocket-client


class CDPError(RuntimeError):
    pass


@dataclass
class Tab:
    id: str
    url: str
    ws_url: str


class CDP:
    def __init__(self, port: int = 9222):
        self.port = port
        self.ws: Optional[websocket.WebSocket] = None
        self._msg_id = 0

    # --- HTTP layer (tab management) -------------------------------------
    def _http_get(self, path: str) -> Any:
        try:
            with urllib.request.urlopen(
                f"http://127.0.0.1:{self.port}{path}", timeout=2
            ) as r:
                return json.loads(r.read())
        except Exception as e:  # noqa: BLE001
            raise CDPError(
                f"Cannot reach Chrome on :{self.port} ({e}). "
                f"Is Chrome running with --remote-debugging-port={self.port}?"
            ) from e

    def list_tabs(self) -> list[Tab]:
        items = self._http_get("/json")
        return [
            Tab(id=t["id"], url=t["url"], ws_url=t["webSocketDebuggerUrl"])
            for t in items
            if t.get("type") == "page"
        ]

    def find_tab(self, url_substring: str) -> Optional[Tab]:
        for tab in self.list_tabs():
            if url_substring in tab.url:
                return tab
        return None

    def open_tab(self, url: str) -> Tab:
        # Chrome's /json/new endpoint is deprecated for security; use existing
        # tab if possible, otherwise navigate the first tab.
        existing = self.find_tab(url.split("/")[2])  # match by host
        if existing:
            self.attach(existing)
            self._send("Page.navigate", {"url": url})
            return existing
        # Try the (still working in many builds) /json/new
        try:
            data = self._http_get(f"/json/new?{url}")
            return Tab(id=data["id"], url=data["url"], ws_url=data["webSocketDebuggerUrl"])
        except CDPError:
            tabs = self.list_tabs()
            if not tabs:
                raise CDPError("No tabs to repurpose")
            self.attach(tabs[0])
            self._send("Page.navigate", {"url": url})
            return tabs[0]

    # --- WebSocket layer (per-tab debugger) ------------------------------
    def attach(self, tab: Tab) -> None:
        self.detach()
        # Chrome 111+ requires --remote-allow-origins or for the client to
        # omit the Origin header entirely. We're not a browser, so we drop it.
        self.ws = websocket.create_connection(
            tab.ws_url, timeout=30, suppress_origin=True
        )
        self._send("Page.enable")
        self._send("Runtime.enable")

    def detach(self) -> None:
        if self.ws:
            try:
                self.ws.close()
            except Exception:  # noqa: BLE001
                pass
        self.ws = None

    def _send(self, method: str, params: Optional[dict] = None) -> dict:
        if not self.ws:
            raise CDPError("Not attached to a tab")
        self._msg_id += 1
        msg = {"id": self._msg_id, "method": method, "params": params or {}}
        self.ws.send(json.dumps(msg))
        # Drain messages until we see the matching id (skip events).
        deadline = time.time() + 30
        while time.time() < deadline:
            raw = self.ws.recv()
            data = json.loads(raw)
            if data.get("id") == self._msg_id:
                if "error" in data:
                    raise CDPError(f"{method} failed: {data['error']}")
                return data.get("result", {})
        raise CDPError(f"Timed out waiting for response to {method}")

    def wait_for_load(self, timeout: int = 15, expect_url_substring: Optional[str] = None) -> None:
        """Wait until document.readyState is complete (and optionally that the
        URL contains an expected substring — useful when we've just kicked off
        a Page.navigate and don't want to read the OLD page state)."""
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                ready = self.evaluate("document.readyState")
                url = self.evaluate("window.location.href") or ""
                url_ok = expect_url_substring is None or expect_url_substring in url
                if ready in ("complete", "interactive") and url_ok:
                    return
            except CDPError:
                pass
            time.sleep(0.25)

    def evaluate(self, expression: str, await_promise: bool = False) -> Any:
        result = self._send(
            "Runtime.evaluate",
            {
                "expression": expression,
                "returnByValue": True,
                "awaitPromise": await_promise,
                "timeout": 30000,
            },
        )
        if result.get("exceptionDetails"):
            details = result["exceptionDetails"]
            raise CDPError(f"JS exception: {details.get('text')} {details.get('exception', {}).get('description', '')}")
        return result.get("result", {}).get("value")
