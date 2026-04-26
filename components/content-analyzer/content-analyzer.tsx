"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { Section } from "@/components/charts/section";
import { KpiCard } from "@/components/charts/kpi-card";
import { cn } from "@/lib/utils";
import { Video, Upload, Link2, ArrowLeft, ArrowRight, X, ChevronRight, Loader2, Settings2, Copy, Check, Clapperboard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/* ── Video Vision API config ── */
const DEFAULT_API = "http://localhost:3001";

/* ── Types ── */
interface VideoMetadata { duration: number; width: number; height: number; fps: number; codec: string; fileSize: number; hasAudio: boolean; filename: string; }
interface ExtractedFrame { timestamp: number; timestampFormatted: string; base64: string; }
interface TranscriptSegment { start: number; end: number; text: string; }
interface AnalysisResult { metadata: VideoMetadata; frames: ExtractedFrame[]; transcript: TranscriptSegment[]; processingTime: number; }

type View = "upload" | "results";
type ResultTab = "breakdown" | "prompts" | "frames" | "transcript" | "info";

/* ── Helpers ── */
function fmtTime(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  if (h > 0) return `${h}h ${m}m ${sec}s`; if (m > 0) return `${m}m ${sec}s`; return `${sec}s`;
}
function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`; if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`; return `${(b / 1073741824).toFixed(2)} GB`;
}

/* ── Frame descriptions ── */
function describeFrame(i: number, total: number, section: string): string {
  if (total <= 1) return `${section} frame`;
  const pct = i / (total - 1);
  if (section === "Hook") {
    if (i === 0) return "Opening shot — first impression";
    if (pct < 0.4) return "Early hook — setting the scene";
    if (pct < 0.7) return "Hook development — building interest";
    return "Hook transition — leading into body";
  }
  if (section === "Body") {
    if (pct < 0.15) return "Body opener — topic introduction";
    if (pct < 0.35) return "Early development — establishing context";
    if (pct < 0.5) return "Building momentum — core content";
    if (pct < 0.65) return "Midpoint — key message delivery";
    if (pct < 0.85) return "Late development — reinforcing points";
    return "Body wrap — preparing to close";
  }
  if (i === 0) return "Close begins — winding down";
  if (pct < 0.5) return "Closing transition — recap or summary";
  if (i === total - 1) return "Final frame — lasting impression";
  return "Closing moment — call to action area";
}

/* ── Breakdown logic ── */
interface BreakdownData {
  hook: { segments: TranscriptSegment[]; frames: ExtractedFrame[]; text: string; endTime: number };
  body: { segments: TranscriptSegment[]; frames: ExtractedFrame[]; text: string };
  closing: { segments: TranscriptSegment[]; frames: ExtractedFrame[]; text: string; startTime: number };
  wordCount: number; wordsPerMin: number; avgSegmentLen: number;
}

function computeBreakdown(r: AnalysisResult): BreakdownData | null {
  const { transcript, frames, metadata } = r;
  if (transcript.length === 0 && frames.length === 0) return null;
  const dur = metadata.duration;
  const hookEnd = Math.min(dur * 0.15, 15);
  const closingStart = Math.max(dur * 0.85, dur - 15);
  const hookSegs = transcript.filter(s => s.start < hookEnd);
  const closingSegs = transcript.filter(s => s.start >= closingStart);
  const bodySegs = transcript.filter(s => s.start >= hookEnd && s.start < closingStart);
  const hookFrames = frames.filter(f => f.timestamp < hookEnd);
  const closingFrames = frames.filter(f => f.timestamp >= closingStart);
  const bodyFrames = frames.filter(f => f.timestamp >= hookEnd && f.timestamp < closingStart);
  const words = transcript.map(s => s.text).join(" ").split(/\s+/).filter(Boolean);
  return {
    hook: { segments: hookSegs, frames: hookFrames, text: hookSegs.map(s => s.text).join(" "), endTime: hookEnd },
    body: { segments: bodySegs, frames: bodyFrames, text: bodySegs.map(s => s.text).join(" ") },
    closing: { segments: closingSegs, frames: closingFrames, text: closingSegs.map(s => s.text).join(" "), startTime: closingStart },
    wordCount: words.length,
    wordsPerMin: dur > 0 ? Math.round((words.length / dur) * 60) : 0,
    avgSegmentLen: transcript.length > 0 ? Math.round(words.length / transcript.length) : 0,
  };
}

/* ── Breakdown section card ── */
function BreakdownCard({ label, accent, text, segments, frames, timeLabel, sectionKey }: {
  label: string; accent: string; text: string;
  segments: TranscriptSegment[]; frames: ExtractedFrame[];
  timeLabel: string; sectionKey: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? frames : frames.slice(0, 4);

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ background: accent, color: "#fff" }}>
          {label[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="text-sm font-semibold text-ink">{label}</span>
            <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-background text-ink-muted">{timeLabel}</span>
            {frames.length > 0 && <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-background text-ink-muted">{frames.length} frames</span>}
          </div>
          <p className="text-sm text-ink-soft leading-relaxed">
            {text ? (text.length > 300 ? text.slice(0, 300) + "..." : text) : <em className="text-ink-muted">No transcript in this section.</em>}
          </p>
        </div>
      </div>

      {/* Frame grid with descriptions */}
      {frames.length > 0 && (
        <div className="px-5 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {visible.map((f, i) => (
              <div key={i} className="rounded-lg overflow-hidden border border-border bg-background">
                <div className="relative">
                  <img src={`data:image/jpeg;base64,${f.base64}`} alt="" className="w-full aspect-video object-cover" />
                  <div className="absolute bottom-0 inset-x-0 px-2 py-1 text-[9px] font-mono font-semibold" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))", color: accent }}>{f.timestampFormatted}</div>
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-[10px] text-ink-soft leading-snug">{describeFrame(i, frames.length, sectionKey)}</p>
                </div>
              </div>
            ))}
          </div>
          {frames.length > 4 && (
            <button onClick={() => setShowAll(!showAll)} className="mt-2 text-[11px] font-medium hover:underline" style={{ color: showAll ? undefined : accent }}>
              {showAll ? "Collapse" : `Show all ${frames.length} frames`}
            </button>
          )}
        </div>
      )}

      {/* Expandable segments */}
      {segments.length > 0 && (
        <div className="border-t border-border">
          <button onClick={() => setExpanded(!expanded)} className="w-full px-5 py-2.5 text-[11px] font-mono text-ink-muted flex items-center gap-1.5 hover:bg-background/50 transition-colors">
            <ChevronRight className={cn("w-3 h-3 transition-transform", expanded && "rotate-90")} />
            {segments.length} segment{segments.length !== 1 ? "s" : ""} &middot; {segments.map(s => s.text).join(" ").split(/\s+/).filter(Boolean).length} words
          </button>
          {expanded && (
            <div className="px-5 pb-4 space-y-1">
              {segments.map((seg, i) => (
                <div key={i} className="flex gap-3 py-1.5 text-xs">
                  <span className="tabular font-mono shrink-0 w-12 text-right font-semibold" style={{ color: accent }}>{fmtTime(seg.start)}</span>
                  <span className="text-ink">{seg.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Seedance prompt generation ── */
interface ShotPrompt {
  shotNumber: number;
  section: string;
  timestamp: string;
  duration: string;
  frame: ExtractedFrame;
  transcript: string;
  prompt: string;
  camera: string;
  mood: string;
}

function inferCamera(index: number, total: number, section: string): string {
  if (section === "Hook") {
    if (index === 0) return "slow push-in, eye-level, centered subject";
    if (index === 1) return "medium close-up, slight dolly forward";
    return "smooth tracking shot, dynamic angle";
  }
  if (section === "Closing") {
    if (index === total - 1) return "slow pull-back, wide establishing shot";
    return "steady medium shot, gentle drift";
  }
  const moves = [
    "locked-off medium shot, clean composition",
    "slow pan right, following action",
    "slight dolly-in, over-the-shoulder",
    "wide shot, rule of thirds",
    "medium close-up, shallow depth of field",
    "tracking shot, parallel to subject",
    "static wide, subject enters frame",
    "slow tilt up, revealing environment",
  ];
  return moves[index % moves.length];
}

function inferMood(section: string, text: string): string {
  if (section === "Hook") return "high-energy, attention-grabbing, vibrant lighting";
  if (section === "Closing") return "warm, reflective, golden-hour tone";
  const lower = text.toLowerCase();
  if (lower.includes("excit") || lower.includes("amaz") || lower.includes("!")) return "upbeat, bright, dynamic energy";
  if (lower.includes("serious") || lower.includes("import") || lower.includes("need to")) return "focused, clean, editorial lighting";
  if (lower.includes("funny") || lower.includes("lol") || lower.includes("haha")) return "playful, warm, natural lighting";
  return "confident, well-lit, professional tone";
}

function generateShotPrompts(result: AnalysisResult, breakdown: BreakdownData): ShotPrompt[] {
  const shots: ShotPrompt[] = [];
  let shotNum = 1;

  const sections: { key: string; data: { frames: ExtractedFrame[]; segments: TranscriptSegment[] }; }[] = [
    { key: "Hook", data: { frames: breakdown.hook.frames, segments: breakdown.hook.segments } },
    { key: "Body", data: { frames: breakdown.body.frames, segments: breakdown.body.segments } },
    { key: "Closing", data: { frames: breakdown.closing.frames, segments: breakdown.closing.segments } },
  ];

  for (const { key, data } of sections) {
    // Every frame gets a prompt
    for (let i = 0; i < data.frames.length; i++) {
      const frame = data.frames[i];
      const nextFrame = data.frames[i + 1];
      const dur = nextFrame
        ? (nextFrame.timestamp - frame.timestamp).toFixed(1)
        : key === "Hook" ? "2.0" : key === "Closing" ? "3.0" : "2.5";

      // Find transcript near this frame
      const nearbyText = data.segments
        .filter(s => Math.abs(s.start - frame.timestamp) < 3)
        .map(s => s.text)
        .join(" ")
        .trim();

      const camera = inferCamera(i, data.frames.length, key);
      const mood = inferMood(key, nearbyText);
      const frameDesc = describeFrame(i, data.frames.length, key);

      // Build the Seedance prompt
      const promptParts: string[] = [];

      // Visual description
      if (key === "Hook" && i === 0) {
        promptParts.push("Opening shot.");
      }
      promptParts.push(`${frameDesc}.`);

      // Add speech context if available
      if (nearbyText) {
        promptParts.push(`Person speaking: "${nearbyText.slice(0, 120)}${nearbyText.length > 120 ? "..." : ""}".`);
      }

      // Camera and mood
      promptParts.push(`Camera: ${camera}.`);
      promptParts.push(`Mood: ${mood}.`);

      // Technical
      promptParts.push(`${result.metadata.width}x${result.metadata.height}, ${dur}s duration, cinematic quality, sharp focus.`);

      shots.push({
        shotNumber: shotNum++,
        section: key,
        timestamp: frame.timestampFormatted,
        duration: `${dur}s`,
        frame,
        transcript: nearbyText,
        prompt: promptParts.join(" "),
        camera,
        mood,
      });
    }
  }

  return shots;
}

/* ── Shot Prompt Card ── */
function ShotCard({ shot, accent }: { shot: ShotPrompt; accent: string }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(shot.prompt);

  const copyPrompt = () => {
    navigator.clipboard.writeText(editedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex">
        {/* Frame preview */}
        <div className="relative shrink-0 w-48">
          <img src={`data:image/jpeg;base64,${shot.frame.base64}`} alt="" className="w-full h-full object-cover" />
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold" style={{ background: accent, color: "#fff" }}>
            Shot {shot.shotNumber}
          </div>
          <div className="absolute bottom-0 inset-x-0 px-2 py-1 text-[9px] font-mono font-semibold" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.8))", color: "#fff" }}>
            {shot.timestamp} &middot; {shot.duration}
          </div>
        </div>

        {/* Prompt content */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `color-mix(in srgb, ${accent} 15%, transparent)`, color: accent }}>{shot.section}</span>
              <span className="font-mono text-[9px] text-ink-muted">{shot.camera}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setEditing(!editing)} className="p-1 rounded hover:bg-border/40 text-ink-muted transition-colors">
                <Clapperboard className="w-3.5 h-3.5" />
              </button>
              <button onClick={copyPrompt} className="p-1 rounded hover:bg-border/40 text-ink-muted transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-positive" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {editing ? (
            <textarea
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              className="w-full text-xs text-ink leading-relaxed bg-background border border-border rounded-md p-2.5 resize-y min-h-[80px] font-mono focus:outline-none focus:border-brand/40"
              rows={4}
            />
          ) : (
            <p className="text-xs text-ink leading-relaxed">{editedPrompt}</p>
          )}

          {shot.transcript && !editing && (
            <p className="mt-2 text-[10px] text-ink-muted italic leading-relaxed truncate">
              &ldquo;{shot.transcript.slice(0, 100)}{shot.transcript.length > 100 ? "..." : ""}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════ */
export function ContentAnalyzer() {
  const [view, setView] = useState<View>("upload");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [url, setUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [resultTab, setResultTab] = useState<ResultTab>("breakdown");
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);
  const [apiBase, setApiBase] = useState(DEFAULT_API);
  const [showSettings, setShowSettings] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const breakdown = useMemo(() => result ? computeBreakdown(result) : null, [result]);

  const analyze = useCallback(async (formData: FormData) => {
    setLoading(true); setStatusMsg("Extracting frames + transcribing audio...");
    try {
      const res = await fetch(`${apiBase}/api/analyze`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data); setResultTab("breakdown"); setView("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally { setLoading(false); }
  }, [apiBase]);

  const handleFile = useCallback(async (file: File) => {
    setError(""); setResult(null); setLoading(true); setStatusMsg(`Processing ${file.name}...`);
    const fd = new FormData(); fd.append("file", file); await analyze(fd);
  }, [analyze]);

  const handleUrl = useCallback(async () => {
    if (!url.trim()) return;
    setError(""); setResult(null); setLoading(true); setStatusMsg("Downloading video...");
    try {
      const res = await fetch(`${apiBase}/api/download`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Download failed");
      const fd = new FormData(); fd.append("filePath", data.filePath); await analyze(fd);
    } catch (err) { setError(err instanceof Error ? err.message : "Download failed"); setLoading(false); }
  }, [url, apiBase, analyze]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && /video/i.test(file.type)) handleFile(file);
  }, [handleFile]);

  const reset = () => { setView("upload"); setResult(null); setError(""); setUrl(""); setSelectedFrame(null); };

  const rTabs: { key: ResultTab; label: string }[] = [
    { key: "breakdown", label: "Breakdown" }, { key: "prompts", label: "Prompts" },
    { key: "frames", label: "Frames" }, { key: "transcript", label: "Transcript" },
    { key: "info", label: "Info" },
  ];

  const shotPrompts = useMemo(() => {
    if (!result || !breakdown) return [];
    return generateShotPrompts(result, breakdown);
  }, [result, breakdown]);

  /* ── Upload view ── */
  if (view === "upload" || loading) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-full max-w-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-medium text-ink">Content Analyzer</h2>
              <p className="text-sm text-ink-muted mt-0.5">Upload a video or paste a link &mdash; local frame extraction + whisper transcription</p>
            </div>
            <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-md hover:bg-border/40 transition-colors text-ink-muted">
              <Settings2 className="w-4 h-4" />
            </button>
          </div>

          {showSettings && (
            <Section title="API Configuration" hint="Video Vision backend URL">
              <div className="flex gap-2">
                <Input value={apiBase} onChange={(e) => setApiBase(e.target.value)} placeholder="http://localhost:3001" className="font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={() => setApiBase(DEFAULT_API)}>Reset</Button>
              </div>
            </Section>
          )}

          {loading ? (
            <div className="rounded-lg border border-border bg-card shadow-sm">
              <div className="flex flex-col items-center py-20 gap-5">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-xl bg-brand/10 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-7 h-7 text-brand animate-spin" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-ink">{statusMsg}</p>
                  <p className="text-xs text-ink-muted mt-1">ffmpeg + whisper-cpp &middot; running locally</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "cursor-pointer rounded-xl border-2 border-dashed px-8 py-16 flex flex-col items-center gap-5 transition-all bg-card",
                  dragOver ? "border-brand bg-brand/5 shadow-lg" : "border-border hover:border-brand/40",
                )}
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-brand/10 text-brand">
                  <Upload className="w-7 h-7" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-ink">Drop a video file here</p>
                  <p className="text-xs text-ink-muted mt-1">or click to browse &mdash; MP4, MOV, AVI, MKV, WebM</p>
                </div>
                <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted">or paste a link</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* URL input */}
              <div className="flex gap-2.5">
                <div className="flex-1 relative">
                  <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                  <Input
                    type="url" value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUrl()}
                    placeholder="https://example.com/video.mp4"
                    className="pl-10 py-3 font-mono text-xs h-auto"
                  />
                </div>
                <Button onClick={handleUrl} disabled={!url.trim()} className="px-6 h-auto">Analyze</Button>
              </div>

              {error && (
                <div className="rounded-lg border border-negative/20 bg-negative/5 px-4 py-3 text-sm text-negative">{error}</div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  /* ── Results view ── */
  if (!result) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={reset} className="p-2 rounded-lg hover:bg-border/40 transition-colors text-ink-muted"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h2 className="font-display text-xl font-medium text-ink">{result.metadata.filename}</h2>
            <p className="text-xs text-ink-muted mt-0.5 font-mono">
              {fmtDuration(result.metadata.duration)} &middot; {result.metadata.width}&times;{result.metadata.height} &middot; {result.metadata.codec.toUpperCase()} &middot; processed in {result.processingTime.toFixed(1)}s
            </p>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Frames" value={result.frames.length} emphasis="brand" />
        <KpiCard label="Transcript Segments" value={result.transcript.length} />
        <KpiCard label="Duration" value={fmtDuration(result.metadata.duration)} />
        <KpiCard label="File Size" value={fmtBytes(result.metadata.fileSize)} />
      </div>

      {/* Tab bar */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 border-b border-border min-w-max">
          {rTabs.map(t => (
            <button key={t.key} onClick={() => setResultTab(t.key)} className={cn("relative px-4 py-2.5 text-sm font-medium transition-colors", resultTab === t.key ? "text-brand" : "text-ink-muted hover:text-ink")}>
              {t.label}
              {resultTab === t.key && <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-brand" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Breakdown ── */}
      {resultTab === "breakdown" && (
        <div className="space-y-4">
          {breakdown ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <KpiCard label="Total Words" value={breakdown.wordCount.toLocaleString()} emphasis="brand" />
                <KpiCard label="Pace" value={`${breakdown.wordsPerMin} wpm`} />
                <KpiCard label="Avg Segment" value={`${breakdown.avgSegmentLen} words`} />
              </div>
              <BreakdownCard label="The Hook" accent="var(--brand)" text={breakdown.hook.text} segments={breakdown.hook.segments} frames={breakdown.hook.frames} timeLabel={`0:00 — ${fmtTime(breakdown.hook.endTime)}`} sectionKey="Hook" />
              <BreakdownCard label="Body" accent="var(--ig)" text={breakdown.body.text} segments={breakdown.body.segments} frames={breakdown.body.frames} timeLabel={`${fmtTime(breakdown.hook.endTime)} — ${fmtTime(breakdown.closing.startTime)}`} sectionKey="Body" />
              <BreakdownCard label="The Close" accent="var(--positive)" text={breakdown.closing.text} segments={breakdown.closing.segments} frames={breakdown.closing.frames} timeLabel={`${fmtTime(breakdown.closing.startTime)} — ${fmtTime(result.metadata.duration)}`} sectionKey="Closing" />
            </>
          ) : (
            <Section title="No breakdown available">
              <p className="text-sm text-ink-muted py-8 text-center">No transcript or frames to analyze.</p>
            </Section>
          )}
        </div>
      )}

      {/* ── Prompts ── */}
      {resultTab === "prompts" && (
        <div className="space-y-4">
          {shotPrompts.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ink-soft">{shotPrompts.length} shots generated &mdash; click the edit icon to refine, copy icon to grab for Seedance</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const all = shotPrompts.map((s, i) => `--- Shot ${i + 1} (${s.section} @ ${s.timestamp}, ${s.duration}) ---\n${s.prompt}`).join("\n\n");
                    navigator.clipboard.writeText(all);
                  }}
                >
                  Copy All Prompts
                </Button>
              </div>

              {/* Hook shots */}
              {shotPrompts.filter(s => s.section === "Hook").length > 0 && (
                <div>
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted mb-3">Hook Shots</h3>
                  <div className="space-y-3">
                    {shotPrompts.filter(s => s.section === "Hook").map(shot => (
                      <ShotCard key={shot.shotNumber} shot={shot} accent="var(--brand)" />
                    ))}
                  </div>
                </div>
              )}

              {/* Body shots */}
              {shotPrompts.filter(s => s.section === "Body").length > 0 && (
                <div>
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted mb-3">Body Shots</h3>
                  <div className="space-y-3">
                    {shotPrompts.filter(s => s.section === "Body").map(shot => (
                      <ShotCard key={shot.shotNumber} shot={shot} accent="var(--ig)" />
                    ))}
                  </div>
                </div>
              )}

              {/* Closing shots */}
              {shotPrompts.filter(s => s.section === "Closing").length > 0 && (
                <div>
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted mb-3">Closing Shots</h3>
                  <div className="space-y-3">
                    {shotPrompts.filter(s => s.section === "Closing").map(shot => (
                      <ShotCard key={shot.shotNumber} shot={shot} accent="var(--positive)" />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <Section title="No prompts available">
              <p className="text-sm text-ink-muted py-8 text-center">Need frames and transcript to generate prompts.</p>
            </Section>
          )}
        </div>
      )}

      {/* ── Frames ── */}
      {resultTab === "frames" && (
        <>
          {selectedFrame !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80" onClick={() => setSelectedFrame(null)}>
              <div className="relative max-w-5xl w-full" onClick={e => e.stopPropagation()}>
                <img src={`data:image/jpeg;base64,${result.frames[selectedFrame].base64}`} alt="" className="w-full rounded-xl shadow-2xl" />
                <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-black/60 text-white backdrop-blur-sm">{result.frames[selectedFrame].timestampFormatted}</div>
                {selectedFrame > 0 && <button onClick={() => setSelectedFrame(selectedFrame - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/70 transition-colors"><ArrowLeft className="w-4 h-4" /></button>}
                {selectedFrame < result.frames.length - 1 && <button onClick={() => setSelectedFrame(selectedFrame + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/70 transition-colors"><ArrowRight className="w-4 h-4" /></button>}
                <button onClick={() => setSelectedFrame(null)} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/70 transition-colors"><X className="w-4 h-4" /></button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {result.frames.map((frame, i) => (
              <div key={i} className="group relative rounded-lg overflow-hidden cursor-pointer border border-border bg-card shadow-sm transition-all hover:border-brand/40 hover:scale-[1.03] hover:shadow-md" onClick={() => setSelectedFrame(i)}>
                <img src={`data:image/jpeg;base64,${frame.base64}`} alt="" className="w-full aspect-video object-cover" />
                <div className="absolute bottom-0 inset-x-0 px-2 py-1 text-[10px] font-mono font-semibold text-brand" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>{frame.timestampFormatted}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Transcript ── */}
      {resultTab === "transcript" && (
        <Section title="Full Transcript" hint={`${result.transcript.length} segments`}>
          {result.transcript.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-12">No audio detected or transcription empty.</p>
          ) : (
            <div className="space-y-0.5 max-h-[70vh] overflow-y-auto">
              {result.transcript.map((seg, i) => (
                <div key={i} className="flex gap-3 py-2.5 px-3 rounded-lg hover:bg-background transition-colors">
                  <span className="tabular font-mono text-[11px] font-semibold shrink-0 w-14 text-right text-brand">{fmtTime(seg.start)}</span>
                  <span className="text-sm text-ink leading-relaxed">{seg.text}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── Info ── */}
      {resultTab === "info" && (
        <Section title="Video Metadata">
          <div className="divide-y divide-border">
            {[
              ["Filename", result.metadata.filename],
              ["Duration", fmtDuration(result.metadata.duration)],
              ["Resolution", `${result.metadata.width} x ${result.metadata.height}`],
              ["FPS", String(result.metadata.fps)],
              ["Codec", result.metadata.codec.toUpperCase()],
              ["File Size", fmtBytes(result.metadata.fileSize)],
              ["Audio Track", result.metadata.hasAudio ? "Yes" : "No"],
              ["Processing Time", `${result.processingTime.toFixed(2)}s`],
              ["Frames Extracted", String(result.frames.length)],
              ["Transcript Segments", String(result.transcript.length)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-3 text-sm">
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">{label}</span>
                <span className="tabular font-medium text-ink">{value}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
