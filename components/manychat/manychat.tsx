"use client";

import { useState } from "react";
import { useDashboardStore } from "@/lib/store";
import type { Flow, Platform } from "@/lib/types";
import { Section } from "@/components/charts/section";
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
import { platformLabel } from "@/lib/format";

const STEP_TYPES = [
  "trigger",
  "condition",
  "action",
  "question",
  "delay",
  "tag",
];

const PLATFORMS: Array<{ value: Flow["platform"]; label: string }> = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "threads", label: "Threads" },
  { value: "multi", label: "Multi-platform" },
];

const FLOW_TYPES: Flow["type"][] = ["lead_capture", "engagement", "sales"];

export function ManyChat() {
  const flows = useDashboardStore((s) => s.flows);
  const addFlow = useDashboardStore((s) => s.addFlow);
  const removeFlow = useDashboardStore((s) => s.removeFlow);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            {flows.length} flows · automation library
          </p>
          <h2 className="font-display mt-2 text-3xl font-medium text-ink">
            ManyChat Flows
          </h2>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="font-mono text-[11px] uppercase tracking-[0.14em]"
        >
          + Create flow
        </Button>
      </header>

      {flows.length === 0 ? (
        <Section title="No flows yet">
          <p className="py-6 text-center text-sm text-ink-muted">
            Click <span className="font-semibold text-ink">Create flow</span>{" "}
            to add your first ManyChat automation.
          </p>
        </Section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {flows.map((f) => (
            <FlowCard
              key={f.id}
              flow={f}
              onRemove={() => removeFlow(f.id)}
            />
          ))}
        </div>
      )}

      <CreateFlowDialog open={open} onOpenChange={setOpen} onAdd={addFlow} />
    </div>
  );
}

function FlowCard({ flow, onRemove }: { flow: Flow; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-medium text-ink">
              {flow.name}
            </h3>
            {flow.platform !== "multi" && (
              <PlatformBadge platform={flow.platform as Platform} />
            )}
            {flow.platform === "multi" && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                multi
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-soft">{flow.description}</p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          {flow.type.replace(/_/g, " ")}
        </span>
      </div>

      <div className="mt-3 rounded border border-border bg-muted/30 p-2 font-mono text-xs">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          Trigger:
        </span>{" "}
        <span className="text-ink">{flow.trigger}</span>
      </div>

      <button
        onClick={() => setOpen(!open)}
        className="mt-3 font-mono text-[11px] uppercase tracking-wider text-brand hover:underline"
      >
        {open ? "Collapse" : `Show ${flow.steps.length} steps`}
      </button>

      {open && (
        <ol className="mt-3 space-y-2 border-t border-border pt-3">
          {flow.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-brand-soft font-mono text-[10px] font-semibold text-brand-deep">
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  {step.type}
                </div>
                <div className="text-sm text-ink">{step.text}</div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={onRemove}
          className="font-mono text-[10px] uppercase tracking-wider text-negative hover:underline"
        >
          Delete flow
        </button>
      </div>
    </div>
  );
}

function CreateFlowDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (f: Flow) => void;
}) {
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<Flow["platform"]>("instagram");
  const [type, setType] = useState<Flow["type"]>("lead_capture");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("");
  const [steps, setSteps] = useState<Array<{ type: string; text: string }>>([
    { type: "action", text: "" },
  ]);

  function submit() {
    if (!name.trim() || !trigger.trim()) return;
    onAdd({
      id: `flow_${Date.now()}`,
      name: name.trim(),
      platform,
      type,
      description: description.trim(),
      trigger: trigger.trim(),
      steps: steps.filter((s) => s.text.trim()),
    });
    setName("");
    setDescription("");
    setTrigger("");
    setSteps([{ type: "action", text: "" }]);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Create Flow</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <Field label="Flow name">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Free Course Lead Capture"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Platform">
              <Select
                value={platform}
                onValueChange={(v) => v && setPlatform(v as Flow["platform"])}
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
            <Field label="Type">
              <Select
                value={type}
                onValueChange={(v) => v && setType(v as Flow["type"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FLOW_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this automation does"
            />
          </Field>
          <Field label="Trigger">
            <Input
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="Story mention, comment keyword, DM, etc."
            />
          </Field>

          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Steps
            </span>
            <div className="mt-1.5 space-y-2">
              {steps.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Select
                    value={s.type}
                    onValueChange={(v) => {
                      if (!v) return;
                      const next = [...steps];
                      next[i] = { ...next[i], type: v };
                      setSteps(next);
                    }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STEP_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={s.text}
                    onChange={(e) => {
                      const next = [...steps];
                      next[i] = { ...next[i], text: e.target.value };
                      setSteps(next);
                    }}
                    placeholder={`Step ${i + 1} description`}
                  />
                  <button
                    onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                    className="px-2 font-mono text-xs text-negative hover:underline"
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setSteps([...steps, { type: "action", text: "" }])
                }
                className="font-mono text-[11px] uppercase tracking-wider text-brand hover:underline"
              >
                + Add step
              </button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!name.trim() || !trigger.trim()}
          >
            Create
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
