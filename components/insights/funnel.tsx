import { Section } from "@/components/charts/section";
import { PlatformDot } from "@/components/charts/platform-badge";
import { fmt, fmtPct, platformLabel } from "@/lib/format";
import type { FunnelStage, Platform } from "@/lib/types";

interface FunnelProps {
  data: Record<Platform, FunnelStage>;
}

export function EngagementFunnel({ data }: FunnelProps) {
  const platforms = Object.keys(data) as Platform[];
  return (
    <Section
      title="Engagement Funnel"
      hint="Avg views → likes → comments → shares per post"
    >
      <div className="space-y-5">
        {platforms.map((p) => {
          const f = data[p];
          if (!f) return null;
          const stages = [
            { label: "Views", v: f.views, color: "var(--brand)" },
            { label: "Likes", v: f.likes, color: "var(--brand-deep)" },
            { label: "Comments", v: f.comments, color: "var(--positive)" },
            ...(f.shares != null
              ? [{ label: "Shares", v: f.shares, color: "var(--warn)" }]
              : []),
          ];
          const max = Math.max(...stages.map((s) => s.v), 1);
          return (
            <div key={p}>
              <div className="mb-1.5 flex items-center gap-2">
                <PlatformDot platform={p} />
                <span className="text-sm font-medium text-ink">
                  {platformLabel[p]}
                </span>
              </div>
              <div className="space-y-1">
                {stages.map((s, i) => {
                  const ratio = stages[0].v
                    ? (s.v / stages[0].v) * 100
                    : 0;
                  return (
                    <div
                      key={s.label}
                      className="flex items-center gap-3 font-mono text-[11px]"
                    >
                      <div className="w-16 uppercase tracking-[0.14em] text-ink-muted">
                        {s.label}
                      </div>
                      <div className="relative h-3 flex-1 overflow-hidden rounded-sm bg-muted">
                        <div
                          className="h-full"
                          style={{
                            width: `${(s.v / max) * 100}%`,
                            background: s.color,
                          }}
                        />
                      </div>
                      <div className="tabular w-16 text-right text-ink">
                        {fmt(s.v)}
                      </div>
                      <div className="tabular w-12 text-right text-ink-muted">
                        {i === 0 ? "—" : fmtPct(ratio, 1)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
