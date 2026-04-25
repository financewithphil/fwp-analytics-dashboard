"use client";

import {
  Cell,
  Pie,
  PieChart as RPieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface Slice {
  name: string;
  value: number;
  color?: string;
}

interface DoughnutChartProps {
  data: Slice[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
  valueFormatter?: (v: number) => string;
}

const PALETTE = [
  "var(--brand)",
  "var(--brand-deep)",
  "var(--positive)",
  "var(--warn)",
  "var(--ig)",
];

export function DoughnutChart({
  data,
  height = 260,
  centerLabel,
  centerValue,
  valueFormatter,
}: DoughnutChartProps) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RPieChart>
          <Pie
            data={data}
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            dataKey="value"
            stroke="var(--card)"
            strokeWidth={2}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--ink)",
              fontSize: 12,
            }}
            formatter={(v) => {
              const n = typeof v === "number" ? v : Number(v) || 0;
              return valueFormatter ? valueFormatter(n) : String(n);
            }}
          />
        </RPieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            {centerValue && (
              <p className="font-display tabular text-3xl font-medium text-ink">
                {centerValue}
              </p>
            )}
            {centerLabel && (
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                {centerLabel}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
