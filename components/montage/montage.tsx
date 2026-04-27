"use client";

import { useEffect, useState } from "react";

/**
 * OpenMontage Studio — embedded via Cloudflare tunnel or localhost fallback.
 *
 * The tunnel URL changes on each restart, so we try the stored tunnel URL
 * first, then fall back to localhost:8484. The user can paste a new tunnel
 * URL into the input field when it rotates.
 */

const LOCALHOST = "http://localhost:8484";
const STORAGE_KEY = "montage_tunnel_url";

type ServerStatus = "checking" | "online" | "offline";

export function Montage() {
  const [tunnelUrl, setTunnelUrl] = useState("");
  const [activeUrl, setActiveUrl] = useState("");
  const [status, setStatus] = useState<ServerStatus>("checking");
  const [inputUrl, setInputUrl] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) || "";
    setTunnelUrl(stored);
    setInputUrl(stored);
    probe(stored);
  }, []);

  async function probe(tunnel: string) {
    setStatus("checking");

    // Try tunnel first
    if (tunnel) {
      try {
        const r = await fetch(`${tunnel}/api/preflight`, { signal: AbortSignal.timeout(5000) });
        if (r.ok) {
          setActiveUrl(tunnel);
          setStatus("online");
          return;
        }
      } catch {}
    }

    // Fallback to localhost
    try {
      const r = await fetch(`${LOCALHOST}/api/preflight`, { signal: AbortSignal.timeout(3000) });
      if (r.ok) {
        setActiveUrl(LOCALHOST);
        setStatus("online");
        return;
      }
    } catch {}

    setStatus("offline");
  }

  function saveTunnel() {
    const cleaned = inputUrl.trim().replace(/\/+$/, "");
    setTunnelUrl(cleaned);
    localStorage.setItem(STORAGE_KEY, cleaned);
    probe(cleaned);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            AI Video Production
          </p>
          <h2 className="font-display text-xl font-medium text-ink">
            Open<em className="font-display italic text-brand">Montage</em>{" "}
            <span className="text-sm font-normal text-ink-muted">Studio</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Status pill */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${
              status === "online"
                ? "bg-emerald-50 text-emerald-700"
                : status === "checking"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === "online"
                  ? "bg-emerald-500"
                  : status === "checking"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-red-500"
              }`}
            />
            {status === "online"
              ? activeUrl === LOCALHOST
                ? "Localhost"
                : "Tunnel"
              : status === "checking"
                ? "Connecting..."
                : "Offline"}
          </span>

          {/* Tunnel URL input */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveTunnel()}
              placeholder="https://xxx.trycloudflare.com"
              className="w-72 rounded border border-border bg-white px-2.5 py-1.5 font-mono text-xs text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
            />
            <button
              onClick={saveTunnel}
              className="rounded bg-brand px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white transition-colors hover:bg-brand/90"
            >
              Connect
            </button>
          </div>
        </div>
      </div>

      {/* Iframe or offline state */}
      {status === "online" && activeUrl ? (
        <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
          <iframe
            src={activeUrl}
            className="h-[calc(100vh-220px)] w-full border-0"
            allow="autoplay; clipboard-write"
            title="OpenMontage Studio"
          />
        </div>
      ) : status === "offline" ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-white px-6 py-20 text-center">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            Server Offline
          </div>
          <p className="max-w-md text-sm text-ink-muted">
            The OpenMontage server is not reachable. Start it locally or paste
            a Cloudflare tunnel URL above.
          </p>
          <div className="mt-4 rounded bg-ink/5 px-4 py-2 font-mono text-xs text-ink-soft">
            cd ~/projects/open-montage && python web/server.py
          </div>
          <div className="mt-2 rounded bg-ink/5 px-4 py-2 font-mono text-xs text-ink-soft">
            cloudflared tunnel --url http://localhost:8484
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-border bg-white py-20">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <span className="ml-3 text-sm text-ink-muted">Connecting to OpenMontage...</span>
        </div>
      )}
    </div>
  );
}
