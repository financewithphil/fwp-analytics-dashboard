// Single Zustand store for client-side state (Brand Deals + Creator Research).
// Calendar / ManyChat / Content Studio / Thumbnails were removed in 2026-04-25
// after Phil scoped the dashboard down to the analytics-only surfaces.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CreatorRecord, Deal } from "./types";

interface DashboardState {
  deals: Deal[];
  creators: CreatorRecord[];

  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, patch: Partial<Deal>) => void;
  removeDeal: (id: string) => void;

  addCreator: (creator: CreatorRecord) => void;
  removeCreator: (id: string) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      deals: [],
      creators: [],

      addDeal: (deal) =>
        set((s) => ({ deals: [...s.deals, deal] })),
      updateDeal: (id, patch) =>
        set((s) => ({
          deals: s.deals.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),
      removeDeal: (id) =>
        set((s) => ({ deals: s.deals.filter((d) => d.id !== id) })),

      addCreator: (creator) =>
        set((s) => ({ creators: [...s.creators, creator] })),
      removeCreator: (id) =>
        set((s) => ({ creators: s.creators.filter((c) => c.id !== id) })),
    }),
    {
      name: "fwp_dashboard_v2",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
