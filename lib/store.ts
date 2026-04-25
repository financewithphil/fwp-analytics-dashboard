// Single Zustand store — replaces the scattered localStorage usage in v1
// (fwp_dashboard, fwp_revenue, fwp_brand_deals, fwp_follower_history,
// fwp_studio_folder).

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  CalendarEvent,
  ContentItem,
  CreatorRecord,
  Deal,
  Flow,
} from "./types";

interface DashboardState {
  deals: Deal[];
  flows: Flow[];
  calendar: CalendarEvent[];
  creators: CreatorRecord[];
  contentQueue: ContentItem[];
  studioFolder: string;

  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, patch: Partial<Deal>) => void;
  removeDeal: (id: string) => void;

  addFlow: (flow: Flow) => void;
  updateFlow: (id: string, patch: Partial<Flow>) => void;
  removeFlow: (id: string) => void;

  addCalendarEvent: (event: CalendarEvent) => void;
  updateCalendarEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  removeCalendarEvent: (id: string) => void;

  addCreator: (creator: CreatorRecord) => void;
  removeCreator: (id: string) => void;

  setContentQueue: (items: ContentItem[]) => void;
  updateContentItem: (id: string, patch: Partial<ContentItem>) => void;
  setStudioFolder: (path: string) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      deals: [],
      flows: [],
      calendar: [],
      creators: [],
      contentQueue: [],
      studioFolder: "",

      addDeal: (deal) =>
        set((s) => ({ deals: [...s.deals, deal] })),
      updateDeal: (id, patch) =>
        set((s) => ({
          deals: s.deals.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),
      removeDeal: (id) =>
        set((s) => ({ deals: s.deals.filter((d) => d.id !== id) })),

      addFlow: (flow) =>
        set((s) => ({ flows: [...s.flows, flow] })),
      updateFlow: (id, patch) =>
        set((s) => ({
          flows: s.flows.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        })),
      removeFlow: (id) =>
        set((s) => ({ flows: s.flows.filter((f) => f.id !== id) })),

      addCalendarEvent: (event) =>
        set((s) => ({ calendar: [...s.calendar, event] })),
      updateCalendarEvent: (id, patch) =>
        set((s) => ({
          calendar: s.calendar.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        })),
      removeCalendarEvent: (id) =>
        set((s) => ({ calendar: s.calendar.filter((c) => c.id !== id) })),

      addCreator: (creator) =>
        set((s) => ({ creators: [...s.creators, creator] })),
      removeCreator: (id) =>
        set((s) => ({ creators: s.creators.filter((c) => c.id !== id) })),

      setContentQueue: (items) => set({ contentQueue: items }),
      updateContentItem: (id, patch) =>
        set((s) => ({
          contentQueue: s.contentQueue.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        })),
      setStudioFolder: (path) => set({ studioFolder: path }),
    }),
    {
      name: "fwp_dashboard_v2",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
