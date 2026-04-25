import { Section } from "@/components/charts/section";
import { PlatformBadge } from "@/components/charts/platform-badge";
import { fmt } from "@/lib/format";
import type { CrossPostItem } from "@/lib/types";

interface CrossPostsProps {
  data: CrossPostItem[];
}

export function CrossPosts({ data }: CrossPostsProps) {
  const top = data
    .map((d) => ({
      ...d,
      total: d.posts.reduce((s, p) => s + (p.views || 0), 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  return (
    <Section
      title="Cross-Posted Content"
      hint={`${data.length} pieces published on multiple platforms`}
      bodyClassName="space-y-3 max-h-[420px] overflow-y-auto pr-1"
    >
      {top.map((item, i) => (
        <div
          key={i}
          className="rounded-md border border-border p-3 hover:border-brand/40"
        >
          <div className="text-sm font-medium text-ink line-clamp-1">
            {item.title || "(no title)"}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[11px]">
            {item.posts.map((p, j) => (
              <a
                key={j}
                href={p.url ?? "#"}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 hover:text-brand"
              >
                <PlatformBadge platform={p.platform} />
                <span className="tabular text-ink-muted">{fmt(p.views)}</span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </Section>
  );
}
