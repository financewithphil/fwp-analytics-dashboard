"use client";

import {
  CartesianGrid,
  Line,
  LineChart as RLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface LineChartProps {
  data: Array<Record<string, number | string>>;
  xKey: string;
  yKey: string;
  height?: number;
  yFormatter?: (v: number) => string;
}

export function LineChart({
  data,
  xKey,
  yKey,
  height = 260,
  yFormatter,
}: LineChartProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RLineChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
        >
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={yFormatter}
            width={40}
          />
          <Tooltip
            cursor={{ stroke: "var(--brand)", strokeWidth: 1, strokeDasharray: "3 3" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--ink)",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--ink-muted)" }}
            formatter={(v) => {
              const n = typeof v === "number" ? v : Number(v) || 0;
              return yFormatter ? yFormatter(n) : String(n);
            }}
          />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke="var(--brand)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--brand)" }}
            activeDot={{ r: 5, fill: "var(--brand-deep)" }}
          />
        </RLineChart>
      </ResponsiveContainer>
    </div>
  );
}
