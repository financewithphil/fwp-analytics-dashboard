"use client";

import { Section } from "@/components/charts/section";
import { useState } from "react";
import { fmt, platformLabel } from "@/lib/format";
import type { FollowData, Platform } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FollowBackProps {
  data: FollowData;
}

const TABS: Platform[] = ["instagram", "tiktok", "youtube", "threads"];

export function DoesntFollowBack({ data }: FollowBackProps) {
  const [active, setActive] = useState<Platform>("instagram");
  const platformData = data[active];
  const list = platformData?.dontFollowBack ?? [];

  return (
    <Section
      title="Doesn't Follow Back"
      hint="Accounts you follow that don't follow you"
      action={
        <div className="flex gap-1 rounded border border-border p-0.5">
          {TABS.map((t) => {
            const count = data[t]?.dontFollowBack?.length ?? 0;
            return (
              <button
                key={t}
                onClick={() => setActive(t)}
                className={cn(
                  "rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition",
                  active === t
                    ? "bg-brand text-white"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {platformLabel[t]} · {fmt(count)}
              </button>
            );
          })}
        </div>
      }
      bodyClassName="-mx-5 max-h-[420px] overflow-y-auto"
    >
      {list.length === 0 ? (
        <div className="py-8 text-center text-sm text-ink-muted">
          {platformData?.note || "No data for this platform yet."}
        </div>
      ) : (
        <table className="data-table tabular w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-y border-border bg-muted/40 text-left">
              <th className="px-5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                Username
              </th>
              <th className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                Display name
              </th>
              <th className="px-5 py-2 text-right font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                Verified
              </th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, 100).map((u) => (
              <tr
                key={u.id || u.username}
                className="border-b border-border last:border-b-0 hover:bg-muted/40"
              >
                <td className="px-5 py-1.5 font-mono text-brand">
                  @{u.username}
                </td>
                <td className="px-2 py-1.5 text-ink-soft truncate">
                  {u.fullName ?? "—"}
                </td>
                <td className="px-5 py-1.5 text-right text-ink-muted">
                  {u.isVerified ? "✓" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {list.length > 100 && (
        <div className="border-t border-border px-5 py-2 text-center text-[11px] text-ink-muted">
          Showing 100 of {fmt(list.length)}.
        </div>
      )}
    </Section>
  );
}
