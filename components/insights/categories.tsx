import { BarChart } from "@/components/charts/bar-chart";
import { Section } from "@/components/charts/section";
import { fmt } from "@/lib/format";

interface CategoriesProps {
  data: Record<string, { count: number; avgViews: number; avgEngagement: number }>;
}

export function ContentCategories({ data }: CategoriesProps) {
  const rows = Object.entries(data)
    .map(([label, v]) => ({
      label: label.replace(/_/g, " "),
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <Section
      title="Content Categories"
      hint="Volume of posts by inferred topic"
    >
      <BarChart
        data={rows}
        xKey="label"
        yKey="count"
        yFormatter={(v) => fmt(v)}
      />
    </Section>
  );
}
