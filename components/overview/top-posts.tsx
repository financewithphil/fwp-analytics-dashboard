import { Section } from "@/components/charts/section";
import { PlatformBadge } from "@/components/charts/platform-badge";
import { fmt, fmtPct, fmtDate } from "@/lib/format";
import { topPosts, toNum } from "@/lib/derive";
import type { Post } from "@/lib/types";

export function TopPosts({ posts }: { posts: Post[] }) {
  const top = topPosts(posts, 30, 10);

  return (
    <Section
      title="Top Performing Posts"
      hint="Last 30 days, ranked by views"
      bodyClassName="-mx-5"
    >
      <div className="overflow-x-auto">
        <table className="data-table tabular w-full text-sm">
          <thead>
            <tr className="border-y border-border bg-muted/40 text-left">
              <th className="px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                Platform
              </th>
              <th className="px-2 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                Date
              </th>
              <th className="px-2 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                Title
              </th>
              <th className="px-2 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                Views
              </th>
              <th className="px-2 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                Likes
              </th>
              <th className="px-2 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                Comments
              </th>
              <th className="px-5 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                Engage
              </th>
            </tr>
          </thead>
          <tbody>
            {top.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-8 text-center text-sm text-ink-muted"
                >
                  No posts in the last 30 days.
                </td>
              </tr>
            ) : (
              top.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-b-0 transition hover:bg-muted/40"
                >
                  <td className="px-5 py-3">
                    <PlatformBadge platform={p.platform} />
                  </td>
                  <td className="px-2 py-3 text-ink-muted">
                    {fmtDate(p.date)}
                  </td>
                  <td className="px-2 py-3 max-w-[460px] truncate text-ink">
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="hover:text-brand hover:underline underline-offset-2"
                      >
                        {p.title || p.caption?.slice(0, 80) || "(no title)"}
                      </a>
                    ) : (
                      p.title || p.caption?.slice(0, 80) || "(no title)"
                    )}
                  </td>
                  <td className="px-2 py-3 text-right text-ink">
                    {fmt(p.views)}
                  </td>
                  <td className="px-2 py-3 text-right text-ink-soft">
                    {fmt(p.likes)}
                  </td>
                  <td className="px-2 py-3 text-right text-ink-soft">
                    {fmt(p.comments)}
                  </td>
                  <td className="px-5 py-3 text-right text-brand">
                    {fmtPct(toNum(p.engagementRate))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
