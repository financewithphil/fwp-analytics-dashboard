# Finance With Phil — Social Media Analytics

PIN-gated analytics dashboard for Phillip Karaya / Finance With Phil's
cross-platform content (Instagram, TikTok, YouTube, Threads).

**Live:** https://financewithphil.github.io/fwp-analytics-dashboard/
**PIN:** 1973

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind v4 with `@theme` design tokens
- shadcn/ui components on top of Radix / Base UI
- Recharts for line / bar / doughnut charts (custom 7×24 heatmap)
- Zustand with `localStorage` persistence for client-side state
- Newsreader (display) + Geist Sans (body) + JetBrains Mono (data),
  self-hosted via `next/font`
- Static export to GitHub Pages (no SSR)

## Project layout

```
app/                     Next.js App Router routes (one per tab)
components/
  charts/                Reusable primitives — KpiCard, LineChart,
                         BarChart, DoughnutChart, PlatformBadge, Section
  layout/                AppShell, Nav, AuthGate, PinWall, DataStatusBar
  overview/              Overview tab composition (8 sections)
  insights/              Insights tab composition (12 sections)
  posts/, comments/      Tab implementations
  calendar/, deals/      Tab implementations
  creators/, manychat/   Tab implementations
  thumbnails/, studio/   Tab implementations (local-server-aware)
lib/
  data.ts                Typed JSON loaders for /public/data/*
  derive.ts              Pure helpers (totals, byPlatform, cadence, etc.)
  store.ts               Zustand store with localStorage persistence
  auth.ts                SHA-256 PIN check (Web Crypto API)
  format.ts              fmt(), fmtPct(), fmtDate(), platformLabel
  fonts.ts               next/font configuration
  studio-server.ts       Client for the optional Python Studio server
  types.ts               Shared TypeScript types
public/data/             Real scraped JSON data (read-only at runtime)
v1-archive/              Original single-file dashboard preserved as-is
```

## Local development

```bash
pnpm install
pnpm dev               # http://localhost:3000
pnpm build             # static export to out/
pnpm lint
```

The PIN gate falls back to "1973" in development. To override, set
`NEXT_PUBLIC_DASHBOARD_PIN_HASH` (SHA-256 hex) in `.env.local`.

## Refreshing data

The dashboard reads `public/data/*.json` at runtime via fetch. To
update:

1. Run the v1 scraping flow (Chrome CDP on port 9222) — see
   `v1-archive/` for the original Python scripts.
2. Replace the JSON files in `public/data/`.
3. Commit and push — GitHub Pages will auto-redeploy in ~60s.

## Optional local Studio server

Two tabs (Thumbnails, Content Studio) integrate with a local Python
server at `localhost:5555` for AI background generation, video
analysis, and one-click publishing. Both tabs detect when the server
is offline and degrade gracefully — caption editing, queue management,
and canvas-based thumbnail variations all work without it.

To run the server, see `v1-archive/studio_server.py`.

## Deploy

GitHub Actions workflow at `.github/workflows/deploy.yml` builds and
publishes to GitHub Pages on every push to `main`. Set the
`DASHBOARD_PIN_HASH` repository secret to override the default PIN.
