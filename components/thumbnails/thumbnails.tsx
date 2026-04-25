"use client";

import { useEffect, useRef, useState } from "react";
import { Section } from "@/components/charts/section";
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
  ThumbAspect,
  ThumbStyle,
  renderThumb,
} from "./thumbnail-canvas";
import { pingStudioServer } from "@/lib/studio-server";
import { cn } from "@/lib/utils";

const STYLES: Array<{ value: ThumbStyle; label: string }> = [
  { value: "bold", label: "Bold + color pop" },
  { value: "minimal", label: "Clean & minimal" },
  { value: "split", label: "Split screen" },
  { value: "gradient", label: "Gradient overlay" },
  { value: "dark", label: "Dark & dramatic" },
];

const ASPECTS: Array<{ value: ThumbAspect; label: string }> = [
  { value: "16:9", label: "YouTube · 16:9" },
  { value: "1:1", label: "Instagram · 1:1" },
  { value: "9:16", label: "TikTok / Story · 9:16" },
];

export function Thumbnails() {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [style, setStyle] = useState<ThumbStyle>("bold");
  const [aspect, setAspect] = useState<ThumbAspect>("16:9");
  const [accent, setAccent] = useState("#1e6fd9");
  const [studioOnline, setStudioOnline] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const canvasRefs = [
    useRef<HTMLCanvasElement | null>(null),
    useRef<HTMLCanvasElement | null>(null),
    useRef<HTMLCanvasElement | null>(null),
    useRef<HTMLCanvasElement | null>(null),
  ];

  useEffect(() => {
    pingStudioServer().then(setStudioOnline);
  }, []);

  function generate() {
    [0, 1, 2, 3].forEach((variant) => {
      const c = canvasRefs[variant].current;
      if (!c) return;
      renderThumb(c, {
        title: title.trim() || "Your hook here",
        subtitle: subtitle.trim() || undefined,
        style,
        aspect,
        accent,
        variant: variant as 0 | 1 | 2 | 3,
      });
    });
    setSelected(null);
  }

  function download() {
    if (selected === null) return;
    const c = canvasRefs[selected].current;
    if (!c) return;
    const link = document.createElement("a");
    link.download = `thumb_${aspect.replace(":", "x")}_v${selected + 1}.png`;
    link.href = c.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            Canvas-based · 4 variations · per-platform aspects
          </p>
          <h2 className="font-display mt-2 text-3xl font-medium text-ink">
            Thumbnail Creator
          </h2>
        </div>
        <ServerBadge online={studioOnline} />
      </header>

      <Section title="Configure">
        <div className="grid items-end gap-3 md:grid-cols-[2fr,1fr,1fr,auto,auto]">
          <Field label="Title / Hook">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="3 cars to avoid in 2026"
            />
          </Field>
          <Field label="Style">
            <Select
              value={style}
              onValueChange={(v) => v && setStyle(v as ThumbStyle)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Aspect">
            <Select
              value={aspect}
              onValueChange={(v) => v && setAspect(v as ThumbAspect)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECTS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Accent">
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded border border-border bg-transparent"
            />
          </Field>
          <Button onClick={generate} disabled={!title.trim()}>
            Generate 4 variations
          </Button>
        </div>
        <Field label="Subtitle (optional)" className="mt-3 max-w-md">
          <Input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Phil's car review"
          />
        </Field>
      </Section>

      <Section
        title="Variations"
        hint="Click any to select, then download"
        action={
          selected !== null && (
            <Button onClick={download} variant="default">
              Download #{selected + 1}
            </Button>
          )
        }
      >
        <div
          className={cn(
            "grid gap-4",
            aspect === "9:16"
              ? "grid-cols-2 md:grid-cols-4"
              : "grid-cols-1 md:grid-cols-2",
          )}
        >
          {[0, 1, 2, 3].map((variant) => (
            <button
              key={variant}
              onClick={() => setSelected(variant)}
              className={cn(
                "group relative overflow-hidden rounded-md border-2 transition",
                selected === variant
                  ? "border-positive shadow-lg"
                  : "border-border hover:border-brand/40",
              )}
              style={{
                aspectRatio:
                  aspect === "16:9" ? "16/9" : aspect === "1:1" ? "1/1" : "9/16",
              }}
            >
              <canvas
                ref={canvasRefs[variant]}
                className="block h-full w-full bg-muted"
              />
              <div className="absolute bottom-2 right-2 rounded bg-card/90 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                #{variant + 1}
              </div>
            </button>
          ))}
        </div>
      </Section>

      {studioOnline === false && (
        <div className="rounded-lg border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-ink-soft">
          <span className="font-mono text-[11px] uppercase tracking-wider text-warn">
            Studio server offline ·
          </span>{" "}
          The local AI background endpoint at{" "}
          <code className="font-mono text-xs">localhost:5555</code> isn&apos;t
          responding. Canvas-only variations still work; AI backgrounds need
          the Python Studio server running.
        </div>
      )}
    </div>
  );
}

function ServerBadge({ online }: { online: boolean | null }) {
  if (online === null) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded font-mono text-[10px] uppercase tracking-[0.16em] px-2 py-1",
        online
          ? "bg-positive-soft text-positive"
          : "bg-warn-soft text-warn",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          online ? "bg-positive" : "bg-warn",
        )}
      />
      Studio · {online ? "online" : "offline"}
    </span>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
