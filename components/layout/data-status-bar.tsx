"use client";

import { useEffect, useState } from "react";
import { loadScrapeState } from "@/lib/data";
import { relativeTime } from "@/lib/format";
import { signOut } from "@/lib/auth";
import { ScrapeDialog } from "./scrape-dialog";

export function DataStatusBar() {
  const [last, setLast] = useState<string | undefined>();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadScrapeState()
      .then((s) => {
        const dates = [
          s.instagram?.lastScrapedDate,
          s.tiktok?.lastScrapedDate,
          s.youtube?.lastScrapedDate,
          s.threads?.lastScrapedDate,
          s.lastAutoCheck,
        ]
          .filter(Boolean)
          .sort()
          .reverse();
        setLast(dates[0]);
      })
      .catch(() => undefined);
  }, []);

  const stale = last
    ? Date.now() - new Date(last).getTime() > 7 * 86_400_000
    : true;

  return (
    <div className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            stale ? "bg-warn" : "bg-positive"
          }`}
        />
        {stale ? "Stale" : "Live"} · scraped {last ? relativeTime(last) : "—"}
      </span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-border px-2 py-1 text-ink-muted transition hover:border-brand/50 hover:text-brand"
      >
        ↻ Refresh data
      </button>
      <button
        type="button"
        onClick={() => {
          signOut();
          window.location.reload();
        }}
        className="text-ink-muted underline-offset-4 transition hover:text-ink hover:underline"
      >
        Sign out
      </button>

      <ScrapeDialog
        open={open}
        onOpenChange={setOpen}
        lastScrapedDate={last}
      />
    </div>
  );
}
