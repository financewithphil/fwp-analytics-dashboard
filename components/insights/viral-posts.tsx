import { Section } from "@/components/charts/section";
import { PlatformBadge } from "@/components/charts/platform-badge";
import { fmt } from "@/lib/format";
import type { ViralPost } from "@/lib/types";

interface ViralPostsProps {
  posts: ViralPost[];
}

export function ViralPosts({ posts }: ViralPostsProps) {
  return (
    <Section
      title="Viral Posts"
      hint={`Posts with 3× the platform average (${posts.length} found)`}
      bodyClassName="max-h-[420px] overflow-y-auto pr-1"
    >
      <ul className="divide-y divide-border">
        {posts.length === 0 && (
          <li className="py-6 text-center text-sm text-ink-muted">
            No viral posts yet.
          </li>
        )}
        {posts.slice(0, 25).map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-2.5">
            <PlatformBadge platform={p.platform} />
            <div className="min-w-0 flex-1">
              <a
                href={p.url ?? "#"}
                target="_blank"
                rel="noreferrer noopener"
                className="block truncate text-sm text-ink hover:text-brand hover:underline underline-offset-2"
              >
                {p.title || "(untitled)"}
              </a>
            </div>
            <div className="tabular text-right">
              <div className="font-mono text-sm font-semibold text-brand">
                {fmt(p.views)}
              </div>
              {p.multiplier && (
                <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  {p.multiplier.toFixed(1)}×
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
