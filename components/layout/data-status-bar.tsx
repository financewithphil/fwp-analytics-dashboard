"use client";

import { useEffect, useState } from "react";
import { loadScrapeState } from "@/lib/data";
import { relativeTime } from "@/lib/format";
import { signOut } from "@/lib/auth";

export function DataStatusBar() {
  const [last, setLast] = useState<string | undefined>();

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

  return (
    <div className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full bg-positive"
        />
        Live · scraped {last ? relativeTime(last) : "—"}
      </span>
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
    </div>
  );
}
