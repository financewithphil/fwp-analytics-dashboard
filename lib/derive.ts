// Computed/derived data from raw posts + comments. Pure functions, no side effects.

import type { Post, Comment, Platform } from "./types";

export const PLATFORMS: Platform[] = [
  "instagram",
  "tiktok",
  "youtube",
  "threads",
];

export function toNum(v: string | number | undefined | null): number {
  if (v === undefined || v === null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

export function totals(posts: Post[]) {
  return posts.reduce(
    (acc, p) => {
      acc.posts += 1;
      acc.views += toNum(p.views);
      acc.likes += toNum(p.likes);
      acc.comments += toNum(p.comments);
      acc.shares += toNum(p.shares);
      acc.saves += toNum(p.saves);
      return acc;
    },
    { posts: 0, views: 0, likes: 0, comments: 0, shares: 0, saves: 0 },
  );
}

export function avgEngagementRate(posts: Post[]): number {
  if (!posts.length) return 0;
  const sum = posts.reduce((s, p) => s + toNum(p.engagementRate), 0);
  return sum / posts.length;
}

export function byPlatform<T>(
  items: T[],
  pick: (i: T) => Platform,
): Record<Platform, T[]> {
  const out: Record<Platform, T[]> = {
    instagram: [],
    tiktok: [],
    youtube: [],
    threads: [],
  };
  for (const it of items) out[pick(it)].push(it);
  return out;
}

export function topPosts(posts: Post[], days = 30, limit = 10): Post[] {
  const cutoff = Date.now() - days * 86_400_000;
  return [...posts]
    .filter((p) => {
      const t = new Date(p.date).getTime();
      return Number.isFinite(t) && t >= cutoff;
    })
    .sort((a, b) => toNum(b.views) - toNum(a.views))
    .slice(0, limit);
}

export function monthlyPostActivity(posts: Post[]) {
  const buckets = new Map<string, number>();
  for (const p of posts) {
    const d = new Date(p.date);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const sorted = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b));
  // Limit to the last 18 months for chart readability
  return sorted.slice(-18).map(([month, count]) => ({ month, count }));
}

export function platformLastPosted(posts: Post[]): {
  date: string | null;
  daysAgo: number | null;
} {
  if (!posts.length) return { date: null, daysAgo: null };
  const dates = posts
    .map((p) => new Date(p.date).getTime())
    .filter((t) => Number.isFinite(t));
  if (!dates.length) return { date: null, daysAgo: null };
  const last = Math.max(...dates);
  const daysAgo = Math.floor((Date.now() - last) / 86_400_000);
  return { date: new Date(last).toISOString().slice(0, 10), daysAgo };
}

export function platformCadence(posts: Post[]): {
  perWeek: number;
  perMonth: number;
} {
  if (!posts.length) return { perWeek: 0, perMonth: 0 };
  const dates = posts
    .map((p) => new Date(p.date).getTime())
    .filter((t) => Number.isFinite(t));
  if (dates.length < 2) return { perWeek: 0, perMonth: 0 };
  const range = (Math.max(...dates) - Math.min(...dates)) / 86_400_000;
  if (range <= 0) return { perWeek: 0, perMonth: 0 };
  const perDay = dates.length / range;
  return {
    perWeek: Number((perDay * 7).toFixed(1)),
    perMonth: Number((perDay * 30).toFixed(1)),
  };
}

export function commentResponseRate(comments: Comment[]): {
  total: number;
  responded: number;
  rate: number;
} {
  const total = comments.length;
  const responded = comments.filter((c) => c.replied).length;
  return {
    total,
    responded,
    rate: total ? (responded / total) * 100 : 0,
  };
}

export function sentimentBreakdown(comments: Comment[]) {
  const out = { positive: 0, neutral: 0, negative: 0, question: 0 };
  for (const c of comments) {
    const s = c.sentiment ?? inferSentiment(c.text);
    out[s] += 1;
  }
  return out;
}

export function inferSentiment(
  text: string,
): "positive" | "neutral" | "negative" | "question" {
  const t = text.toLowerCase();
  if (t.includes("?")) return "question";
  if (/(bad|wrong|hate|poor|terrible|awful|sucks|trash)/.test(t))
    return "negative";
  if (/(love|great|awesome|perfect|amazing|fire|thank)/.test(t))
    return "positive";
  return "neutral";
}
