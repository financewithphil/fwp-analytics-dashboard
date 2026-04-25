"use client";

import { Section } from "@/components/charts/section";
import { KpiCard } from "@/components/charts/kpi-card";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/lib/store";
import { fmt, fmtDate } from "@/lib/format";
import { AddDealDialog } from "./add-deal-dialog";
import { useMemo, useState } from "react";

const CURRENCY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function RevenueSummary() {
  const deals = useDashboardStore((s) => s.deals);
  const [open, setOpen] = useState(false);

  const stats = useMemo(() => {
    const earned = deals
      .filter((d) => d.status === "paid" || d.status === "completed")
      .reduce((s, d) => s + d.value, 0);
    const pipeline = deals
      .filter((d) => !["paid", "completed"].includes(d.status))
      .reduce((s, d) => s + d.value, 0);
    const total = deals.reduce((s, d) => s + d.value, 0);
    const avg = deals.length ? total / deals.length : 0;
    return { earned, pipeline, total, avg, count: deals.length };
  }, [deals]);

  const recent = useMemo(() => deals.slice(-5).reverse(), [deals]);

  return (
    <Section
      title="Revenue & Brand Deals"
      hint="Synced with the Brand Deals tab"
      action={
        <Button
          size="sm"
          onClick={() => setOpen(true)}
          className="font-mono text-[11px] uppercase tracking-[0.14em]"
        >
          + Add deal
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Earned"
          value={CURRENCY.format(stats.earned)}
          hint={`${stats.count} deals`}
          emphasis="brand"
        />
        <KpiCard
          label="Pipeline"
          value={CURRENCY.format(stats.pipeline)}
          hint="not yet paid"
        />
        <KpiCard label="Total Value" value={CURRENCY.format(stats.total)} />
        <KpiCard label="Avg Deal" value={CURRENCY.format(stats.avg)} />
      </div>

      {recent.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-md border border-border">
          <table className="data-table tabular w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                  Brand
                </th>
                <th className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                  Status
                </th>
                <th className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                  Date
                </th>
                <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {recent.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2 text-ink">{d.brand}</td>
                  <td className="px-2 py-2">
                    <span className="rounded bg-brand-soft px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-brand-deep">
                      {d.status}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-ink-muted">
                    {fmtDate(d.startDate)}
                  </td>
                  <td className="px-4 py-2 text-right text-ink">
                    {CURRENCY.format(d.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddDealDialog open={open} onOpenChange={setOpen} />
    </Section>
  );
}

export { fmt };
