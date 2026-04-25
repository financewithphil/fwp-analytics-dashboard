import { LineChart } from "@/components/charts/line-chart";
import { Section } from "@/components/charts/section";
import type { Post } from "@/lib/types";
import { monthlyPostActivity } from "@/lib/derive";

export function PostActivity({ posts }: { posts: Post[] }) {
  const data = monthlyPostActivity(posts).map((d) => ({
    month: formatMonth(d.month),
    count: d.count,
  }));
  return (
    <Section
      title="Monthly Post Activity"
      hint="Posts published per month across all platforms"
    >
      <LineChart data={data} xKey="month" yKey="count" />
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
