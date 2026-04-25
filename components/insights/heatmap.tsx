"use client";

import { Section } from "@/components/charts/section";
import { fmt } from "@/lib/format";
import type { HeatmapCell } from "@/lib/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface HeatmapProps {
  data: HeatmapCell[][]; // [day][hour]
}

export function PostingHeatmap({ data }: HeatmapProps) {
  const flat = data.flat().filter((c) => c.count > 0);
  const maxViews = flat.length
    ? Math.max(...flat.map((c) => c.avgViews))
    : 1;

  // Find the best slot to surface as a callout
  type Best = { day: string; hour: number; cell: HeatmapCell };
  const best: Best | null = data.reduce<Best | null>((acc, row, dIdx) => {
    return row.reduce<Best | null>((inner, cell, h) => {
      if (cell.count > 0 && (!inner || cell.avgViews > inner.cell.avgViews)) {
        return { day: DAYS[dIdx], hour: h, cell };
      }
      return inner;
    }, acc);
  }, null);

  return (
    <Section
      title="Posting Heatmap"
      hint="Average views by day-of-week × hour-of-day. Brighter = stronger."
      action={
        best ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
            Best slot ·{" "}
            <span className="text-brand">
              {best.day} {best.hour.toString().padStart(2, "0")}:00
            </span>{" "}
            · {fmt(best.cell.avgViews)} avg
          </span>
        ) : undefined
      }
      bodyClassName="overflow-x-auto"
    >
      <div className="min-w-[640px]">
        <div className="grid grid-cols-[36px_repeat(24,minmax(0,1fr))] gap-px">
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={h}
              className="font-mono text-center text-[9px] uppercase tracking-wider text-ink-muted leading-none pb-1"
            >
              {h % 3 === 0 ? h.toString().padStart(2, "0") : ""}
            </div>
          ))}
          {DAYS.map((day, dIdx) => (
            <DayRow
              key={day}
              dayLabel={day}
              cells={data[dIdx] ?? []}
              maxViews={maxViews}
            />
          ))}
        </div>
      </div>
    </Section>
  );
}

function DayRow({
  dayLabel,
  cells,
  maxViews,
}: {
  dayLabel: string;
  cells: HeatmapCell[];
  maxViews: number;
}) {
  return (
    <>
      <div className="flex h-5 items-center font-mono text-[9px] uppercase tracking-wider text-ink-muted">
        {dayLabel}
      </div>
      {Array.from({ length: 24 }, (_, h) => {
        const cell = cells[h] ?? {
          count: 0,
          avgEngagement: 0,
          avgViews: 0,
        };
        const intensity = cell.count
          ? Math.min(1, cell.avgViews / maxViews)
          : 0;
        const bg = cell.count
          ? `color-mix(in oklab, var(--brand) ${Math.round(intensity * 90 + 10)}%, white)`
          : "var(--muted)";
        return (
          <div
            key={h}
            className="h-5 rounded-[2px] transition hover:scale-110"
            style={{ background: bg }}
            title={
              cell.count
                ? `${dayLabel} ${h.toString().padStart(2, "0")}:00 — ${cell.count} posts, ${fmt(
                    cell.avgViews,
                  )} avg views, ${cell.avgEngagement.toFixed(1)}% eng`
                : `${dayLabel} ${h.toString().padStart(2, "0")}:00 — no posts`
            }
          />
        );
      })}
    </>
  );
}
