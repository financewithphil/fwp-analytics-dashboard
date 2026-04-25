"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboardStore } from "@/lib/store";
import type { Deal, Platform } from "@/lib/types";
import { useState } from "react";

interface AddDealDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const PLATFORM_OPTIONS: Array<{ value: Platform | "multi"; label: string }> = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "threads", label: "Threads" },
  { value: "multi", label: "Multi-platform" },
];

const STATUS_OPTIONS: Deal["status"][] = [
  "prospect",
  "outreach",
  "negotiation",
  "contracted",
  "delivered",
  "paid",
  "completed",
];

export function AddDealDialog({ open, onOpenChange }: AddDealDialogProps) {
  const addDeal = useDashboardStore((s) => s.addDeal);
  const [brand, setBrand] = useState("");
  const [platform, setPlatform] = useState<Deal["platform"]>("instagram");
  const [status, setStatus] = useState<Deal["status"]>("prospect");
  const [value, setValue] = useState("");
  const [startDate, setStartDate] = useState("");

  function reset() {
    setBrand("");
    setPlatform("instagram");
    setStatus("prospect");
    setValue("");
    setStartDate("");
  }

  function submit() {
    if (!brand.trim()) return;
    const v = parseFloat(value);
    addDeal({
      id: `deal_${Date.now()}`,
      brand: brand.trim(),
      platform,
      status,
      value: Number.isFinite(v) ? v : 0,
      startDate: startDate || undefined,
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add Brand Deal</DialogTitle>
          <DialogDescription>
            Log a new partnership. You can edit deliverables and contacts on
            the Brand Deals tab.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
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
                  {PLATFORM_OPTIONS.map((p) => (
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
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Value (USD)">
              <Input
                type="number"
                inputMode="decimal"
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!brand.trim()}>
            Add deal
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
