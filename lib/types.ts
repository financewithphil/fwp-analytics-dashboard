// Shared types — mirror the JSON shapes in /public/data/*.

export type Platform = "instagram" | "tiktok" | "youtube" | "threads";

export interface Post {
  id: string;
  platform: Platform;
  type?: string; // reel | carousel | story | video | short | post
  date: string; // ISO 8601
  time?: string;
  caption?: string;
  thumbnail?: string;
  url?: string;
  views: number;
  likes: number;
  comments: number;
  shares?: number;
  saves?: number;
  engagementRate?: number;
}

export interface Comment {
  id: string;
  postId?: string;
  platform: Platform;
  author: string;
  text: string;
  likes: number;
  date: string;
  sentiment?: "positive" | "neutral" | "negative" | "question";
  replied?: boolean;
}

export interface FollowerSnapshot {
  date: string; // YYYY-MM-DD
  instagram: number;
  tiktok: number;
  youtube: number;
  threads: number;
}

export interface ScrapeState {
  followers: Record<Platform, number>;
  lastScrapedDate?: string;
  lastAutoCheck?: string;
  needsRefresh?: boolean;
}

export interface FollowData {
  instagram: { followers: string[]; following: string[] };
  tiktok: { followers: string[]; following: string[] };
  youtube?: { followers: string[]; following: string[] };
  threads?: { followers: string[]; following: string[] };
}

export interface AnalyticsBundle {
  postingHeatmap?: Array<Array<{ avgViews: number; postCount: number }>>;
  // Other pre-computed sections live here; loosely typed for now.
  [key: string]: unknown;
}

export interface Deal {
  id: string;
  brand: string;
  platform: Platform | "multi";
  status:
    | "prospect"
    | "outreach"
    | "negotiation"
    | "contracted"
    | "delivered"
    | "paid"
    | "completed";
  value: number;
  startDate?: string;
  endDate?: string;
  description?: string;
  deliverables?: string[];
  pocEmail?: string;
  pocPhone?: string;
  postUrl?: string;
  notes?: string;
}

export interface Flow {
  id: string;
  name: string;
  platform: Platform | "multi";
  type: "lead_capture" | "engagement" | "sales";
  description: string;
  trigger: string;
  steps: Array<{ type: string; text: string }>;
}

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  platform: Platform;
  type: string;
  title: string;
  status: "planned" | "draft" | "scheduled" | "posted";
}

export interface CreatorRecord {
  id: string;
  handle: string;
  platform: Platform;
  niche: string;
  followers: number;
  followersChange?: number;
  followers7d?: number;
}

export interface ContentItem {
  id: string;
  filename: string;
  status: "inbox" | "analyzed" | "captioned" | "ready" | "posted";
  platforms: Partial<Record<Platform, { caption?: string }>>;
  posted_to?: Platform[];
  timestamps?: Record<string, string>;
}
