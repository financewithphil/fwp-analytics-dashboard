import { BarChart } from "@/components/charts/bar-chart";
import { DoughnutChart } from "@/components/charts/doughnut-chart";
import { Section } from "@/components/charts/section";
import { KpiCard } from "@/components/charts/kpi-card";
import { fmt, fmtPct, platformLabel } from "@/lib/format";
import {
  PLATFORMS,
  byPlatform,
  commentResponseRate,
  sentimentBreakdown,
} from "@/lib/derive";
import type { Comment } from "@/lib/types";

const PLATFORM_COLOR: Record<string, string> = {
  Instagram: "var(--ig)",
  TikTok: "var(--tt)",
  YouTube: "var(--yt)",
  Threads: "var(--th)",
};

export function ResponseRate({ comments }: { comments: Comment[] }) {
  const overall = commentResponseRate(comments);
  const grouped = byPlatform(comments, (c) => c.platform);
  const perPlatform = PLATFORMS.map((p) => ({
    platform: platformLabel[p],
    rate: Number(commentResponseRate(grouped[p]).rate.toFixed(2)),
  }));
  const sentiment = sentimentBreakdown(comments);
  const sentimentData = [
    { name: "Positive", value: sentiment.positive, color: "var(--positive)" },
    { name: "Neutral", value: sentiment.neutral, color: "var(--ink-muted)" },
    { name: "Negative", value: sentiment.negative, color: "var(--negative)" },
    { name: "Question", value: sentiment.question, color: "var(--brand)" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KpiCard
          label="Overall Response Rate"
          value={fmtPct(overall.rate)}
          hint={`${fmt(overall.responded)} replies of ${fmt(overall.total)}`}
          emphasis="brand"
        />
        <KpiCard
          label="Total Comments"
          value={fmt(overall.total)}
          hint="across all posts"
        />
        <KpiCard
          label="Replies Sent"
          value={fmt(overall.responded)}
          hint={overall.responded === 0 ? "Untapped engagement" : "from Phil"}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Response Rate by Platform">
          <BarChart
            data={perPlatform}
            xKey="platform"
            yKey="rate"
            colorMap={PLATFORM_COLOR}
            yFormatter={(v) => fmtPct(v, 1)}
          />
        </Section>
        <Section
          title="Comment Sentiment"
          hint="Auto-classified via keyword pattern"
        >
          <DoughnutChart
            data={sentimentData}
            centerLabel="Comments"
            centerValue={fmt(overall.total)}
          />
        </Section>
      </div>
    </div>
  );
}
