import { BarChart } from "@/components/charts/bar-chart";
import { DoughnutChart } from "@/components/charts/doughnut-chart";
import { Section } from "@/components/charts/section";
import { fmt, fmtPct, platformLabel } from "@/lib/format";
import { PLATFORMS, byPlatform, totals, avgEngagementRate } from "@/lib/derive";
import type { Post } from "@/lib/types";

const PLATFORM_COLOR: Record<string, string> = {
  Instagram: "var(--ig)",
  TikTok: "var(--tt)",
  YouTube: "var(--yt)",
  Threads: "var(--th)",
};

export function PlatformCharts({ posts }: { posts: Post[] }) {
  const grouped = byPlatform(posts, (p) => p.platform);

  const engagementData = PLATFORMS.map((p) => ({
    platform: platformLabel[p],
    rate: Number(avgEngagementRate(grouped[p]).toFixed(2)),
  }));

  const viewsData = PLATFORMS.map((p) => ({
    platform: platformLabel[p],
    views: totals(grouped[p]).views,
  }));

  const distData = PLATFORMS.map((p) => ({
    name: platformLabel[p],
    value: grouped[p].length,
    color: PLATFORM_COLOR[platformLabel[p]],
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Section title="Engagement Rate" hint="Average % per post">
        <BarChart
          data={engagementData}
          xKey="platform"
          yKey="rate"
          colorMap={PLATFORM_COLOR}
          yFormatter={(v) => fmtPct(v, 1)}
        />
      </Section>
      <Section title="Total Views" hint="Lifetime, by platform">
        <BarChart
          data={viewsData}
          xKey="platform"
          yKey="views"
          colorMap={PLATFORM_COLOR}
          yFormatter={(v) => fmt(v)}
        />
      </Section>
      <Section title="Post Distribution" hint="Share of total posts">
        <DoughnutChart
          data={distData}
          centerLabel="Total Posts"
          centerValue={fmt(posts.length)}
        />
      </Section>
    </div>
  );
}
