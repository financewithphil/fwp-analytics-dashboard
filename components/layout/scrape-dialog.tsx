"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  pingScraper,
  startScrape,
  getScrapeStatus,
  SCRAPER_URL,
  type ScrapeJob,
  type ScraperHealth,
} from "@/lib/scrape-client";
import { fmtDate, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ScrapeDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lastScrapedDate?: string;
}

export function ScrapeDialog({
  open,
  onOpenChange,
  lastScrapedDate,
}: ScrapeDialogProps) {
  const [health, setHealth] = useState<ScraperHealth | null | "checking">(
    "checking",
  );
  const [job, setJob] = useState<ScrapeJob | null>(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<number | null>(null);

  // Probe health when the dialog opens
  useEffect(() => {
    if (!open) return;
    setHealth("checking");
    pingScraper().then(setHealth);
  }, [open]);

  // Poll job status while running
  useEffect(() => {
    if (!job || (job.status !== "queued" && job.status !== "running")) {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    pollRef.current = window.setInterval(async () => {
      const next = await getScrapeStatus(job.id);
      if (next) setJob(next);
    }, 2000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [job]);

  async function handleStart() {
    setStarting(true);
    const started = await startScrape();
    setStarting(false);
    if (started) setJob(started);
  }

  function handleClose(v: boolean) {
    if (!v && job?.status === "complete") {
      // Reload so the dashboard picks up fresh JSON
      window.location.reload();
      return;
    }
    onOpenChange(v);
  }

  const eta = job ? new Date(Date.parse(job.startedAt) + job.etaSeconds * 1000) : null;
  const etaLabel = eta?.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Refresh Dashboard Data
          </DialogTitle>
          <DialogDescription>
            Re-scrapes Instagram, TikTok, YouTube, and Threads via the local
            scraper service.
          </DialogDescription>
        </DialogHeader>

        {/* Last scrape summary */}
        <div className="rounded-md border border-border bg-muted/40 p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            Last scraped
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-display text-lg font-medium text-ink">
              {lastScrapedDate ? fmtDate(lastScrapedDate) : "Never"}
            </span>
            <span className="font-mono text-xs text-ink-muted">
              {lastScrapedDate ? relativeTime(lastScrapedDate) : "—"}
            </span>
          </div>
        </div>

        {/* States */}
        {health === "checking" && (
          <p className="text-sm text-ink-muted">Checking scraper service…</p>
        )}

        {health === null && (
          <ServiceOffline />
        )}

        {health && health !== "checking" && !job && (
          <ReadyToStart isStub={health.version.startsWith("0.1")} />
        )}

        {job && (job.status === "queued" || job.status === "running") && (
          <RunningJob job={job} etaLabel={etaLabel} />
        )}

        {job?.status === "complete" && (
          <CompleteJob job={job} etaLabel={etaLabel} />
        )}

        {job?.status === "error" && (
          <div className="rounded-md border border-negative/40 bg-negative-soft p-3 text-sm text-ink">
            <div className="font-mono text-[10px] uppercase tracking-wider text-negative">
              Scrape failed
            </div>
            <p className="mt-1">{job.error ?? "Unknown error"}</p>
          </div>
        )}

        <DialogFooter>
          {!job && health && health !== "checking" && (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleStart} disabled={starting}>
                {starting ? "Starting…" : "Start scrape"}
              </Button>
            </>
          )}
          {job?.status === "complete" && (
            <Button onClick={() => window.location.reload()}>
              Reload to see fresh data
            </Button>
          )}
          {(job?.status === "queued" || job?.status === "running") && (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Close — keep running in background
            </Button>
          )}
          {(health === null || job?.status === "error") && (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ServiceOffline() {
  return (
    <div className="rounded-md border border-warn/40 bg-warn-soft p-3 text-sm text-ink-soft">
      <div className="font-mono text-[10px] uppercase tracking-wider text-warn">
        Scraper service not running
      </div>
      <p className="mt-2">
        Start it in a terminal so the dashboard can call it on{" "}
        <code className="font-mono text-xs">{SCRAPER_URL}</code>:
      </p>
      <pre className="mt-2 overflow-x-auto rounded bg-ink/90 px-3 py-2 font-mono text-[11px] text-white">
        python3 ~/projects/fwp-analytics-dashboard/scrape/server.py
      </pre>
    </div>
  );
}

function ReadyToStart({ isStub }: { isStub: boolean }) {
  return (
    <div className="space-y-2 text-sm text-ink-soft">
      <p>
        Re-scrapes all four platforms sequentially. The dashboard's freshness
        timestamps update as each platform finishes.
      </p>
      <div className="rounded border border-border bg-muted/40 px-3 py-2 text-xs">
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          Status by platform
        </div>
        <ul className="mt-1.5 space-y-0.5">
          <li>
            <span className="text-positive">●</span> Instagram — real scraper
            (needs Chrome on :9222 + IG login)
          </li>
          <li>
            <span className="text-warn">●</span> TikTok / YouTube / Threads —
            scaffold (will error; doesn&apos;t block IG)
          </li>
        </ul>
      </div>
      {isStub && (
        <div className="rounded border border-border bg-card px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          Note · stub mode active
        </div>
      )}
    </div>
  );
}

function RunningJob({
  job,
  etaLabel,
}: {
  job: ScrapeJob;
  etaLabel?: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          <span>
            Scraping{job.currentPlatform ? ` · ${job.currentPlatform}` : "…"}
          </span>
          <span className="tabular text-ink">{job.progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-brand transition-all duration-500"
            style={{ width: `${job.progress}%` }}
          />
        </div>
      </div>
      <div className="rounded-md border border-brand/40 bg-brand-soft p-3 text-sm text-brand-deep">
        <div className="font-mono text-[10px] uppercase tracking-wider text-brand">
          Come back at {etaLabel ?? "—"}
        </div>
        <p className="mt-1 text-ink-soft">
          You can close this dialog — the scrape keeps running. Reload the
          dashboard once it&apos;s complete and the new numbers will appear.
        </p>
      </div>
    </div>
  );
}

function CompleteJob({
  job,
  etaLabel,
}: {
  job: ScrapeJob;
  etaLabel?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-positive/40 bg-positive-soft p-3 text-sm text-ink",
      )}
    >
      <div className="font-mono text-[10px] uppercase tracking-wider text-positive">
        ✓ Scrape complete
      </div>
      <p className="mt-1">
        Finished {job.platforms.length} platform
        {job.platforms.length === 1 ? "" : "s"} at{" "}
        {job.completedAt
          ? new Date(job.completedAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })
          : etaLabel}
        . Reload the dashboard to see the updated data.
      </p>
    </div>
  );
}
