"use client";

import { useMemo, useState } from "react";
import { useDashboardStore } from "@/lib/store";
import type { CalendarEvent, Platform } from "@/lib/types";
import { Section } from "@/components/charts/section";
import { PlatformBadge, PlatformDot } from "@/components/charts/platform-badge";
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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PLATFORMS: Platform[] = ["instagram", "tiktok", "youtube", "threads"];

export function Calendar() {
  const events = useDashboardStore((s) => s.calendar);
  const addEvent = useDashboardStore((s) => s.addCalendarEvent);
  const removeEvent = useDashboardStore((s) => s.removeCalendarEvent);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [defaultDate, setDefaultDate] = useState<string>("");

  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [events]);

  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return [...events]
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 20);
  }, [events]);

  const monthLabel = cursor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            Plan · Schedule · Track
          </p>
          <h2 className="font-display mt-2 text-3xl font-medium text-ink">
            Content Calendar
          </h2>
        </div>
        <Button
          onClick={() => {
            setDefaultDate(today);
            setOpenAdd(true);
          }}
          className="font-mono text-[11px] uppercase tracking-[0.14em]"
        >
          + Add content
        </Button>
      </header>

      <Section
        title={monthLabel}
        action={
          <div className="flex gap-1">
            <NavButton
              onClick={() =>
                setCursor(
                  (c) => new Date(c.getFullYear(), c.getMonth() - 1, 1),
                )
              }
              dir="prev"
            />
            <NavButton
              onClick={() => setCursor(new Date())}
              dir="today"
            />
            <NavButton
              onClick={() =>
                setCursor(
                  (c) => new Date(c.getFullYear(), c.getMonth() + 1, 1),
                )
              }
              dir="next"
            />
          </div>
        }
      >
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded border border-border">
          {DAYS.map((d) => (
            <div
              key={d}
              className="bg-muted px-2 py-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted"
            >
              {d}
            </div>
          ))}
          {grid.map((cell, i) => {
            const dayEvents = eventsByDay.get(cell.iso) ?? [];
            const isToday = cell.iso === today;
            return (
              <button
                key={i}
                onClick={() => {
                  if (cell.inMonth) setOpenDay(cell.iso);
                }}
                className={cn(
                  "min-h-[88px] bg-card p-1.5 text-left transition hover:bg-muted/40",
                  !cell.inMonth && "bg-muted/30 text-ink-muted",
                  isToday && "ring-1 ring-inset ring-brand",
                )}
              >
                <div
                  className={cn(
                    "tabular text-sm font-medium",
                    isToday ? "text-brand" : "text-ink",
                  )}
                >
                  {cell.day}
                </div>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-1 text-[10px] truncate"
                    >
                      <PlatformDot platform={e.platform} />
                      <span className="truncate text-ink-soft">{e.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-ink-muted">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Upcoming Content" hint={`${upcoming.length} planned`}>
        {upcoming.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">
            Nothing scheduled. Click any future day on the calendar to add
            something.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {upcoming.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 py-2.5 text-sm"
              >
                <span className="font-mono tabular text-xs text-ink-muted w-24">
                  {fmtDate(e.date)}
                </span>
                <PlatformBadge platform={e.platform} />
                <span className="flex-1 text-ink">{e.title}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  {e.status}
                </span>
                <button
                  onClick={() => removeEvent(e.id)}
                  className="font-mono text-[10px] uppercase tracking-wider text-negative hover:underline"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <DayDialog
        date={openDay}
        events={openDay ? eventsByDay.get(openDay) ?? [] : []}
        onClose={() => setOpenDay(null)}
        onAdd={(d) => {
          setOpenDay(null);
          setDefaultDate(d);
          setOpenAdd(true);
        }}
        onDelete={removeEvent}
      />

      <AddEventDialog
        open={openAdd}
        defaultDate={defaultDate}
        onOpenChange={setOpenAdd}
        onAdd={addEvent}
      />
    </div>
  );
}

function NavButton({
  onClick,
  dir,
}: {
  onClick: () => void;
  dir: "prev" | "next" | "today";
}) {
  const label = dir === "prev" ? "←" : dir === "next" ? "→" : "Today";
  return (
    <button
      onClick={onClick}
      className="rounded border border-border px-2.5 py-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:border-brand/50 hover:text-brand"
    >
      {label}
    </button>
  );
}

function buildMonthGrid(cursor: Date) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number; inMonth: boolean; iso: string }> = [];

  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    cells.push({ day: d.getDate(), inMonth: false, iso: iso(d) });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    cells.push({ day: i, inMonth: true, iso: iso(d) });
  }
  while (cells.length % 7 !== 0) {
    const d = new Date(year, month + 1, cells.length - daysInMonth - startDow + 1);
    cells.push({ day: d.getDate(), inMonth: false, iso: iso(d) });
  }
  return cells;
}

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function DayDialog({
  date,
  events,
  onClose,
  onAdd,
  onDelete,
}: {
  date: string | null;
  events: CalendarEvent[];
  onClose: () => void;
  onAdd: (date: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Dialog open={!!date} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        {date && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                {fmtDate(date)}
              </DialogTitle>
            </DialogHeader>
            {events.length === 0 ? (
              <p className="py-4 text-sm text-ink-muted">
                No content planned for this day.
              </p>
            ) : (
              <ul className="space-y-2 py-2">
                {events.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 rounded border border-border p-3"
                  >
                    <PlatformBadge platform={e.platform} />
                    <span className="flex-1 text-sm text-ink">{e.title}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      {e.status}
                    </span>
                    <button
                      onClick={() => {
                        onDelete(e.id);
                        if (events.length === 1) onClose();
                      }}
                      className="font-mono text-[10px] uppercase tracking-wider text-negative hover:underline"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <DialogFooter>
              <Button onClick={() => onAdd(date)}>+ Add content</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddEventDialog({
  open,
  defaultDate,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  defaultDate: string;
  onOpenChange: (v: boolean) => void;
  onAdd: (e: CalendarEvent) => void;
}) {
  const [date, setDate] = useState(defaultDate);
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("reel");
  const [status, setStatus] = useState<CalendarEvent["status"]>("planned");

  // Sync default date when opened
  useMemo(() => setDate(defaultDate), [defaultDate]);

  function submit() {
    if (!title.trim() || !date) return;
    onAdd({
      id: `evt_${Date.now()}`,
      date,
      platform,
      title: title.trim(),
      type,
      status,
    });
    setTitle("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add Content</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <Field label="Title">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="3 cars to avoid in 2026"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Type">
              <Select
                value={type}
                onValueChange={(v) => v && setType(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["reel", "carousel", "story", "video", "short", "post"].map(
                    (t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Platform">
              <Select
                value={platform}
                onValueChange={(v) => setPlatform(v as Platform)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {platformLabel[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select
                value={status}
                onValueChange={(v) =>
                  setStatus(v as CalendarEvent["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["planned", "draft", "scheduled", "posted"] as const).map(
                    (s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!title.trim() || !date}>
            Add
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
