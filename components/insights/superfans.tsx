import { Section } from "@/components/charts/section";
import { PlatformBadge } from "@/components/charts/platform-badge";
import type { TopCommenter, AudienceOverlap } from "@/lib/types";
import { KpiCard } from "@/components/charts/kpi-card";
import { fmt, fmtPct } from "@/lib/format";

interface SuperfansProps {
  commenters: TopCommenter[];
  overlap?: AudienceOverlap;
}

export function Superfans({ commenters, overlap }: SuperfansProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Section
        title="Superfans"
        hint="Most-frequent commenters across all platforms"
        bodyClassName="-mx-5 max-h-[420px] overflow-y-auto"
        className="lg:col-span-2"
      >
        <table className="data-table tabular w-full text-sm">
          <tbody>
            {commenters.slice(0, 20).map((c, i) => (
              <tr
                key={c.username + i}
                className="border-b border-border last:border-b-0 hover:bg-muted/40"
              >
                <td className="px-5 py-2 font-mono text-[11px] text-ink-muted w-8">
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td className="py-2 text-ink">{c.username}</td>
                <td className="px-2 py-2">
                  <div className="flex gap-1">
                    {c.platforms.map((p) => (
                      <PlatformBadge key={p} platform={p} />
                    ))}
                  </div>
                </td>
                <td className="px-5 py-2 text-right font-mono text-brand">
                  {c.count} comments
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {overlap && (
        <div className="space-y-4">
          <KpiCard
            label="Cross-platform users"
            value={fmt(overlap.crossPlatformUsers)}
            hint={`out of ${fmt(overlap.totalUniqueUsers)} unique`}
            emphasis="brand"
          />
          <Section title="Per-platform unique commenters" hint="">
            <ul className="space-y-2 font-mono text-sm">
              {Object.entries(overlap.platformBreakdown).map(([p, n]) => (
                <li
                  key={p}
                  className="flex items-center justify-between border-b border-border/60 py-1 last:border-b-0"
                >
                  <span className="uppercase tracking-[0.14em] text-ink-muted text-[11px]">
                    {p}
                  </span>
                  <span className="tabular text-ink">{fmt(n)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-xs text-ink-muted">
              Overlap rate:{" "}
              <span className="font-mono text-brand">
                {fmtPct(
                  overlap.totalUniqueUsers
                    ? (overlap.crossPlatformUsers / overlap.totalUniqueUsers) *
                        100
                    : 0,
                )}
              </span>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
