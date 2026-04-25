"use client";

import { useEffect, useState } from "react";
import { useDashboardStore } from "@/lib/store";
import { loadAllPosts } from "@/lib/data";
import type { ContentItem, Platform } from "@/lib/types";
import { Section } from "@/components/charts/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlatformBadge } from "@/components/charts/platform-badge";
import { pingStudioServer, STUDIO_SERVER_URL } from "@/lib/studio-server";
import { cn } from "@/lib/utils";
import { fmt, platformLabel } from "@/lib/format";

const STAGES: ContentItem["status"][] = [
  "inbox",
  "analyzed",
  "captioned",
  "ready",
  "posted",
];

const PLATFORMS: Platform[] = ["instagram", "tiktok", "youtube", "threads"];

const PLATFORM_LIMITS: Record<Platform, number> = {
  instagram: 2200,
  tiktok: 2200,
  youtube: 5000,
  threads: 500,
};

export function Studio() {
  const queue = useDashboardStore((s) => s.contentQueue);
  const setQueue = useDashboardStore((s) => s.setContentQueue);
  const updateItem = useDashboardStore((s) => s.updateContentItem);
  const folder = useDashboardStore((s) => s.studioFolder);
  const setFolder = useDashboardStore((s) => s.setStudioFolder);

  const [studioOnline, setStudioOnline] = useState<boolean | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [folderInput, setFolderInput] = useState(folder);
  const [postCount, setPostCount] = useState<number | null>(null);

  useEffect(() => {
    pingStudioServer().then(setStudioOnline);
    loadAllPosts().then((p) => setPostCount(p.length));
  }, []);

  const selected = queue.find((q) => q.id === selectedId);

  function quickAdd() {
    const id = `c_${Date.now()}`;
    setQueue([
      ...queue,
      {
        id,
        filename: `clip_${queue.length + 1}.mp4`,
        status: "inbox",
        platforms: { instagram: { caption: "" } },
      },
    ]);
    setSelectedId(id);
  }

  function moveTo(id: string, status: ContentItem["status"]) {
    updateItem(id, { status });
  }

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            Pipeline · {postCount !== null ? `${fmt(postCount)} posts in archive · ` : ""}
            {queue.length} in queue
          </p>
          <h2 className="font-display mt-2 text-3xl font-medium text-ink">
            Content Studio
          </h2>
        </div>
        <ServerBadge online={studioOnline} />
      </header>

      <Section title="Source folder" hint="Where the Python scanner watches for new clips">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Path" className="flex-1 min-w-[260px]">
            <Input
              value={folderInput}
              onChange={(e) => setFolderInput(e.target.value)}
              placeholder="/Users/phillipkaraya/Content Studio"
            />
          </Field>
          <Button
            onClick={() => setFolder(folderInput)}
            variant="default"
          >
            Save path
          </Button>
          <Button onClick={quickAdd} variant="ghost">
            + Quick add stub
          </Button>
        </div>
      </Section>

      <Section title="Pipeline">
        <div className="grid gap-3 md:grid-cols-5">
          {STAGES.map((stage) => {
            const items = queue.filter((q) => q.status === stage);
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
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.length === 0 && (
                    <div className="rounded border border-dashed border-border bg-card/60 px-2 py-3 text-center font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      —
                    </div>
                  )}
                  {items.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => setSelectedId(it.id)}
                      className={cn(
                        "block w-full truncate rounded border bg-card p-2 text-left text-sm transition",
                        selectedId === it.id
                          ? "border-brand"
                          : "border-border hover:border-brand/40",
                      )}
                    >
                      {it.filename}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {selected && (
        <Section
          title="Detail"
          hint={`Filename: ${selected.filename}`}
          action={
            <Button
              onClick={() => {
                setQueue(queue.filter((q) => q.id !== selected.id));
                setSelectedId(null);
              }}
              variant="ghost"
              className="text-negative"
            >
              Delete
            </Button>
          }
        >
          <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
            <div>
              <div className="aspect-video grid place-items-center rounded-md border border-dashed border-border bg-muted">
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Video preview
                </span>
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                Live video preview, device frames, and key-frame extraction
                require the local Studio server at{" "}
                <code className="font-mono">{STUDIO_SERVER_URL}</code>.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <SmallButton
                  label="Mark Analyzed"
                  onClick={() => moveTo(selected.id, "analyzed")}
                  active={selected.status === "analyzed"}
                />
                <SmallButton
                  label="Mark Captioned"
                  onClick={() => moveTo(selected.id, "captioned")}
                  active={selected.status === "captioned"}
                />
                <SmallButton
                  label="Mark Ready"
                  onClick={() => moveTo(selected.id, "ready")}
                  active={selected.status === "ready"}
                />
                <SmallButton
                  label="Mark Posted"
                  onClick={() => moveTo(selected.id, "posted")}
                  active={selected.status === "posted"}
                />
              </div>
            </div>
            <div className="space-y-3">
              {PLATFORMS.map((p) => (
                <CaptionEditor
                  key={p}
                  platform={p}
                  value={selected.platforms[p]?.caption ?? ""}
                  onChange={(v) =>
                    updateItem(selected.id, {
                      platforms: {
                        ...selected.platforms,
                        [p]: { caption: v },
                      },
                    })
                  }
                />
              ))}
            </div>
          </div>
        </Section>
      )}

      {studioOnline === false && (
        <div className="rounded-lg border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-ink-soft">
          <span className="font-mono text-[11px] uppercase tracking-wider text-warn">
            Studio server offline ·
          </span>{" "}
          Caption editing and queue management still work locally. To enable
          video analysis, AI cover generation, and one-click publishing, run{" "}
          <code className="font-mono text-xs">studio_server.py</code> on{" "}
          <code className="font-mono text-xs">{STUDIO_SERVER_URL}</code>.
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

function CaptionEditor({
  platform,
  value,
  onChange,
}: {
  platform: Platform;
  value: string;
  onChange: (v: string) => void;
}) {
  const limit = PLATFORM_LIMITS[platform];
  const over = value.length > limit;
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlatformBadge platform={platform} />
          <span className="text-sm font-medium text-ink">
            {platformLabel[platform]}
          </span>
        </div>
        <span
          className={cn(
            "tabular font-mono text-[11px]",
            over ? "text-negative" : "text-ink-muted",
          )}
        >
          {value.length} / {limit}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full resize-y rounded border border-border bg-card p-2 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
        placeholder={`Caption for ${platformLabel[platform]}…`}
      />
    </div>
  );
}

function SmallButton({
  label,
  onClick,
  active,
}: {
  label: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded border px-3 py-1.5 text-left font-mono text-[11px] uppercase tracking-wider transition",
        active
          ? "border-positive bg-positive-soft text-positive"
          : "border-border text-ink-muted hover:border-brand/50 hover:text-brand",
      )}
    >
      {label}
    </button>
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
