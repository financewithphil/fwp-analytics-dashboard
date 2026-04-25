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

  return (
    <Section
      title="Posting Heatmap"
      hint="Average views by day-of-week × hour-of-day. Brighter = stronger."
      bodyClassName="-mx-1 overflow-x-auto"
    >
      <div className="min-w-[680px] px-1">
        <div className="grid grid-cols-[44px_repeat(24,minmax(0,1fr))] gap-px">
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={h}
              className="font-mono text-center text-[9px] uppercase tracking-wider text-ink-muted"
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
      <div className="flex items-center font-mono text-[10px] uppercase tracking-wider text-ink-muted">
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
        const textColor = intensity > 0.55 ? "white" : "var(--ink-muted)";
        return (
          <div
            key={h}
            className="aspect-square rounded-[2px] text-center font-mono text-[8.5px] leading-none transition hover:scale-110"
            style={{ background: bg }}
            title={
              cell.count
                ? `${dayLabel} ${h.toString().padStart(2, "0")}:00 — ${cell.count} posts, ${fmt(
                    cell.avgViews,
                  )} avg views, ${cell.avgEngagement.toFixed(1)}% eng`
                : `${dayLabel} ${h.toString().padStart(2, "0")}:00 — no posts`
            }
          >
            <span
              className="grid h-full place-items-center"
              style={{ color: textColor }}
            >
              {cell.count > 0 ? cell.count : ""}
            </span>
          </div>
        );
      })}
    </>
  );
}
