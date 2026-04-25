// Number, date, and platform helpers — ports of v1's fmt() and platformBadge().

import type { Platform } from "./types";

export function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export function fmtPct(
  n: number | undefined | null,
  digits = 1,
): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n.toFixed(digits) + "%";
}

export function fmtDate(input: string | Date | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function relativeTime(input: string | Date | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export const platformLabel: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  threads: "Threads",
};

export const platformShort: Record<Platform, string> = {
  instagram: "IG",
  tiktok: "TT",
  youtube: "YT",
  threads: "TH",
};

export const platformColor: Record<Platform, string> = {
  instagram: "var(--ig)",
  tiktok: "var(--tt)",
  youtube: "var(--yt)",
  threads: "var(--th)",
};
