import { fmt, platformLabel, relativeTime } from "@/lib/format";
import { PlatformDot } from "@/components/charts/platform-badge";
import { PLATFORMS, byPlatform, platformCadence, platformLastPosted } from "@/lib/derive";
import type { Platform, Post, ScrapeState } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PlatformStatusRow({
  posts,
  scrape,
}: {
  posts: Post[];
  scrape: ScrapeState;
}) {
  const grouped = byPlatform(posts, (p) => p.platform);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {PLATFORMS.map((p) => {
        const last = platformLastPosted(grouped[p]);
        const cad = platformCadence(grouped[p]);
        const followers = scrape.followers?.[p] ?? 0;
        const stale = (last.daysAgo ?? 0) > 7;
        return (
          <div
            key={p}
            className="rounded-lg border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlatformDot platform={p} />
                <h4 className="text-sm font-semibold text-ink">
                  {platformLabel[p]}
                </h4>
              </div>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]",
                  stale
                    ? "bg-warn-soft text-warn"
                    : "bg-positive-soft text-positive",
                )}
              >
                {stale ? "stale" : "active"}
              </span>
            </div>
            <p className="font-display tabular mt-3 text-2xl font-medium text-ink">
              {fmt(followers)}
              <span className="ml-1 text-xs font-normal text-ink-muted">
                followers
              </span>
            </p>
            <dl className="mt-3 space-y-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              <div className="flex justify-between">
                <dt>Last post</dt>
                <dd className="text-ink-soft">
                  {last.date ? relativeTime(last.date) : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Cadence</dt>
                <dd className="tabular text-ink-soft">
                  {cad.perWeek.toFixed(1)}/wk · {cad.perMonth.toFixed(1)}/mo
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Total posts</dt>
                <dd className="tabular text-ink-soft">
                  {fmt(grouped[p].length)}
                </dd>
              </div>
            </dl>
          </div>
        );
      })}
    </div>
  );
}

export type { Platform };
