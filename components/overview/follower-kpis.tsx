import { KpiCard } from "@/components/charts/kpi-card";
import { fmt, fmtPct } from "@/lib/format";
import type { Post, Comment, ScrapeState } from "@/lib/types";
import { totals, avgEngagementRate, commentResponseRate } from "@/lib/derive";

export function FollowerKpis({
  posts,
  comments,
  scrape,
}: {
  posts: Post[];
  comments: Comment[];
  scrape: ScrapeState;
}) {
  const t = totals(posts);
  const totalFollowers =
    (scrape.followers?.instagram ?? 0) +
    (scrape.followers?.tiktok ?? 0) +
    (scrape.followers?.youtube ?? 0) +
    (scrape.followers?.threads ?? 0);
  const engRate = avgEngagementRate(posts);
  const response = commentResponseRate(comments);

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <KpiCard
        label="Total Followers"
        value={fmt(totalFollowers)}
        hint="across 4 platforms"
        emphasis="brand"
      />
      <KpiCard label="Total Posts" value={fmt(t.posts)} hint="all-time" />
      <KpiCard
        label="Avg Engagement"
        value={fmtPct(engRate)}
        hint="per post"
      />
      <KpiCard label="Total Views" value={fmt(t.views)} hint="all-time" />
      <KpiCard
        label="Total Comments"
        value={fmt(t.comments)}
        hint="from posts"
      />
      <KpiCard
        label="Response Rate"
        value={fmtPct(response.rate)}
        hint={`${fmt(response.responded)} / ${fmt(response.total)} replied`}
      />
    </div>
  );
}
