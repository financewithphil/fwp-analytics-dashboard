import { LineChart } from "@/components/charts/line-chart";
import { Section } from "@/components/charts/section";
import { fmt } from "@/lib/format";
import type { GrowthMonth } from "@/lib/types";

interface GrowthProps {
  data: GrowthMonth[];
}

export function GrowthVelocity({ data }: GrowthProps) {
  const chartData = data.slice(-24).map((m) => ({
    month: formatMonth(m.month),
    views: m.views,
  }));
  return (
    <Section
      title="Growth Velocity"
      hint="Total monthly views, last 24 months"
    >
      <LineChart
        data={chartData}
        xKey="month"
        yKey="views"
        yFormatter={(v) => fmt(v)}
      />
    </Section>
  );
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}
