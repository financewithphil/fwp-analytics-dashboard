import { Section } from "@/components/charts/section";
import { fmt, fmtPct } from "@/lib/format";
import type { HashtagStat } from "@/lib/types";

interface HashtagsProps {
  data: HashtagStat[];
}

export function HashtagPerformance({ data }: HashtagsProps) {
  const top = data.slice(0, 15);
  return (
    <Section
      title="Top Hashtag Performance"
      hint="Hashtags ranked by avg views per post"
      bodyClassName="-mx-5 max-h-[420px] overflow-y-auto"
    >
      <table className="data-table tabular w-full text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="border-y border-border bg-muted/40 text-left">
            <Th>Hashtag</Th>
            <Th align="right">Posts</Th>
            <Th align="right">Avg views</Th>
            <Th align="right">Avg engage</Th>
            <Th align="right">Total views</Th>
          </tr>
        </thead>
        <tbody>
          {top.map((h) => (
            <tr
              key={h.tag}
              className="border-b border-border last:border-b-0 hover:bg-muted/40"
            >
              <td className="px-5 py-2 font-mono text-brand">{h.tag}</td>
              <td className="px-2 py-2 text-right text-ink">{h.count}</td>
              <td className="px-2 py-2 text-right text-ink">
                {fmt(h.avgViews)}
              </td>
              <td className="px-2 py-2 text-right text-ink-soft">
                {fmtPct(h.avgEngagement)}
              </td>
              <td className="px-5 py-2 text-right text-ink">
                {fmt(h.totalViews)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted first:pl-5 last:pr-5"
      style={{ textAlign: align }}
    >
      {children}
    </th>
  );
}
