"use client";

import { useMemo, useState } from "react";
import { useDashboardStore } from "@/lib/store";
import type { Deal, Platform } from "@/lib/types";
import { Section } from "@/components/charts/section";
import { KpiCard } from "@/components/charts/kpi-card";
import { PlatformBadge } from "@/components/charts/platform-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { fmtDate, platformLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const STAGES: Deal["status"][] = [
  "prospect",
  "outreach",
  "negotiation",
  "contracted",
  "delivered",
  "paid",
  "completed",
];

const PLATFORMS: Array<{ value: Deal["platform"]; label: string }> = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "threads", label: "Threads" },
  { value: "multi", label: "Multi-platform" },
];

const CURRENCY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function Deals() {
  const deals = useDashboardStore((s) => s.deals);
  const addDeal = useDashboardStore((s) => s.addDeal);
  const updateDeal = useDashboardStore((s) => s.updateDeal);
  const removeDeal = useDashboardStore((s) => s.removeDeal);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState<Deal | null>(null);
  const [platformFilter, setPlatformFilter] = useState<
    Deal["platform"] | "all"
  >("all");

  const filteredDeals = useMemo(
    () =>
      platformFilter === "all"
        ? deals
        : deals.filter((d) => d.platform === platformFilter),
    [deals, platformFilter],
  );

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

  const dealsByStage = useMemo(() => {
    const map = new Map<Deal["status"], Deal[]>();
    for (const s of STAGES) map.set(s, []);
    for (const d of filteredDeals) {
      const arr = map.get(d.status) ?? [];
      arr.push(d);
      map.set(d.status, arr);
    }
    return map;
  }, [filteredDeals]);

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            Pipeline · Revenue · Forecast
          </p>
          <h2 className="font-display mt-2 text-3xl font-medium text-ink">
            Brand Deals
          </h2>
        </div>
        <Button
          onClick={() => setOpenAdd(true)}
          className="font-mono text-[11px] uppercase tracking-[0.14em]"
        >
          + New deal
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard
          label="Total Value"
          value={CURRENCY.format(stats.total)}
          hint={`${stats.count} deals`}
          emphasis="brand"
        />
        <KpiCard
          label="Earned"
          value={CURRENCY.format(stats.earned)}
          hint="paid + completed"
        />
        <KpiCard
          label="Pipeline"
          value={CURRENCY.format(stats.pipeline)}
          hint="not yet paid"
        />
        <KpiCard label="Avg Deal" value={CURRENCY.format(stats.avg)} />
        <KpiCard label="Active" value={String(stats.count)} hint="all stages" />
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          Filter:
        </span>
        <Select
          value={platformFilter}
          onValueChange={(v) =>
            setPlatformFilter(v as Deal["platform"] | "all")
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Section title="Pipeline" hint="7-stage view, click any card to edit">
        <div className="grid gap-3 md:grid-cols-7">
          {STAGES.map((stage) => {
            const list = dealsByStage.get(stage) ?? [];
            return (
              <div
                key={stage}
                className="rounded-md border border-border bg-muted/30 p-2"
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    {stage}
                  </span>
                  <span className="tabular text-[11px] text-ink">
                    {list.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {list.length === 0 && (
                    <div className="rounded border border-dashed border-border bg-card/60 px-2 py-3 text-center font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      —
                    </div>
                  )}
                  {list.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setOpenEdit(d)}
                      className="block w-full rounded border border-border bg-card p-2 text-left transition hover:border-brand/40"
                    >
                      <div className="text-sm font-medium text-ink truncate">
                        {d.brand}
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        {d.platform === "multi" ? (
                          <span className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">
                            multi
                          </span>
                        ) : (
                          <PlatformBadge platform={d.platform as Platform} />
                        )}
                        <span className="font-mono tabular text-xs text-brand">
                          {CURRENCY.format(d.value)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="All Deals" bodyClassName="-mx-5 overflow-x-auto">
        {filteredDeals.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-ink-muted">
            No deals yet. Click + New deal to get started.
          </p>
        ) : (
          <table className="data-table tabular w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/40 text-left">
                <Th>Brand</Th>
                <Th>Platform</Th>
                <Th>Status</Th>
                <Th>Start</Th>
                <Th align="right">Value</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/40"
                >
                  <td className="px-5 py-2 text-ink">{d.brand}</td>
                  <td className="px-2 py-2">
                    {d.platform === "multi" ? (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                        multi
                      </span>
                    ) : (
                      <PlatformBadge platform={d.platform as Platform} />
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                        d.status === "paid" || d.status === "completed"
                          ? "bg-positive-soft text-positive"
                          : "bg-brand-soft text-brand-deep",
                      )}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-ink-muted">
                    {fmtDate(d.startDate)}
                  </td>
                  <td className="px-2 py-2 text-right text-ink">
                    {CURRENCY.format(d.value)}
                  </td>
                  <td className="px-5 py-2 text-right">
                    <button
                      onClick={() => setOpenEdit(d)}
                      className="font-mono text-[10px] uppercase tracking-wider text-brand hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeDeal(d.id)}
                      className="ml-3 font-mono text-[10px] uppercase tracking-wider text-negative hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <DealFormDialog
        mode="add"
        open={openAdd}
        onOpenChange={setOpenAdd}
        onSubmit={(d) => addDeal(d)}
      />
      <DealFormDialog
        mode="edit"
        open={!!openEdit}
        onOpenChange={(v) => !v && setOpenEdit(null)}
        existing={openEdit ?? undefined}
        onSubmit={(d) => updateDeal(d.id, d)}
      />
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted first:pl-5 last:pr-5"
      style={{ textAlign: align }}
    >
      {children}
    </th>
  );
}

function DealFormDialog({
  mode,
  open,
  onOpenChange,
  existing,
  onSubmit,
}: {
  mode: "add" | "edit";
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing?: Deal;
  onSubmit: (d: Deal) => void;
}) {
  const [brand, setBrand] = useState(existing?.brand ?? "");
  const [platform, setPlatform] = useState<Deal["platform"]>(
    existing?.platform ?? "instagram",
  );
  const [status, setStatus] = useState<Deal["status"]>(
    existing?.status ?? "prospect",
  );
  const [value, setValue] = useState(existing ? String(existing.value) : "");
  const [startDate, setStartDate] = useState(existing?.startDate ?? "");
  const [endDate, setEndDate] = useState(existing?.endDate ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [pocEmail, setPocEmail] = useState(existing?.pocEmail ?? "");

  // Sync state when opening for edit
  useMemo(() => {
    if (existing) {
      setBrand(existing.brand);
      setPlatform(existing.platform);
      setStatus(existing.status);
      setValue(String(existing.value));
      setStartDate(existing.startDate ?? "");
      setEndDate(existing.endDate ?? "");
      setDescription(existing.description ?? "");
      setPocEmail(existing.pocEmail ?? "");
    }
  }, [existing]);

  function submit() {
    if (!brand.trim()) return;
    const v = parseFloat(value);
    onSubmit({
      id: existing?.id ?? `deal_${Date.now()}`,
      brand: brand.trim(),
      platform,
      status,
      value: Number.isFinite(v) ? v : 0,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      description: description.trim() || undefined,
      pocEmail: pocEmail.trim() || undefined,
    });
    if (mode === "add") {
      setBrand("");
      setValue("");
      setStartDate("");
      setEndDate("");
      setDescription("");
      setPocEmail("");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {mode === "add" ? "Add Brand Deal" : "Edit Deal"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <Field label="Brand">
            <Input
              autoFocus
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Bridgestone"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Platform">
              <Select
                value={platform}
                onValueChange={(v) => setPlatform(v as Deal["platform"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as Deal["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Value (USD)">
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="2500"
              />
            </Field>
            <Field label="Start date">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Field>
            <Field label="End date">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Field>
          </div>
          <Field label="POC email">
            <Input
              type="email"
              value={pocEmail}
              onChange={(e) => setPocEmail(e.target.value)}
              placeholder="contact@brand.com"
            />
          </Field>
          <Field label="Description">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deliverables, scope, notes…"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!brand.trim()}>
            {mode === "add" ? "Add" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
