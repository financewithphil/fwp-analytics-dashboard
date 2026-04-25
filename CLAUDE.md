@AGENTS.md

# FWP Analytics Dashboard — project brain

## What this is
The Finance With Phil social media analytics dashboard. Originally a
single 5,109-line `index.html` rebuilt as Next.js 16 + Tailwind v4 +
shadcn/ui in April 2026 (see `v1-archive/` for the original).

## Stack
- Next.js 16 App Router · TypeScript · Tailwind v4 · shadcn/ui
- Recharts (line/bar/doughnut). Custom 7×24 heatmap is hand-rolled.
- Zustand + localStorage persistence (key: `fwp_dashboard_v2`)
- Static export → GitHub Pages
- Self-hosted fonts via `next/font`: Newsreader / Geist Sans / JetBrains Mono

## Tabs (and where they live)
| Tab | Route | Component | Reads from |
|---|---|---|---|
| Overview | `/` | `components/overview/overview.tsx` | posts × 4, comments, scrape_state |
| Post Analysis | `/posts` | `components/posts/posts.tsx` | posts × 4 |
| Comments | `/comments` | `components/comments/comments.tsx` | comments |
| Insights | `/insights` | `components/insights/insights.tsx` | analytics, follow_data |
| Creator Research | `/creators` | `components/creators/creators.tsx` | Zustand only |
| Thumbnails | `/thumbnails` | `components/thumbnails/thumbnails.tsx` | local studio server |
| Calendar | `/calendar` | `components/calendar/calendar.tsx` | Zustand only |
| ManyChat | `/manychat` | `components/manychat/manychat.tsx` | Zustand only |
| Studio | `/studio` | `components/studio/studio.tsx` | local studio server + Zustand |
| Brand Deals | `/deals` | `components/deals/deals.tsx` | Zustand only |

## Design system (don't drift)
- Background: `#eaf3fb` (light brand blue) — non-negotiable, this is THE brand move
- Brand: `#1e6fd9` blue, used as the single dominant accent
- Surfaces: white (`#ffffff`) cards on the blue background
- Text: `#0a1628` ink, `#334155` soft, `#64748b` muted
- Positive `#16a34a`, Negative `#dc2626`, Warn `#d97706` — sparse use only
- Per-platform colors: IG `#c13584`, TT `#111111`, YT `#cc0000`, TH `#0a1628`
- Display font: **Newsreader** (italic for emphasis on "Analytics" word)
- Body: **Geist Sans**
- Mono: **JetBrains Mono** for eyebrows, KPI labels, data, hashtags
- Card borders: 8px radius. Data tables: **0px radius** — sharp.
- KPI numbers use `tabular` class for tabular figures.

When extending: don't add new accent colors without checking the
palette first. The whole point of this rebuild was escaping the v1 AI
slop palette (`#6c5ce7` purple).

## Data
- All JSON in `public/data/` is real, scraped on 2026-03-28.
- Schema is documented in `lib/types.ts`.
- The dashboard reads via `fetch()` at runtime — no build-time data
  embedding. Push new JSON files and the live site picks them up.
- **The scraping pipeline is manual** (Chrome CDP via Phil's Mac).
  `v1-archive/daily_update.sh` only timestamps + git pushes — it does
  NOT actually re-scrape. Productizing recurring scraping is a
  separate project.

## PIN gate
- SHA-256 client-side check (Web Crypto API), sessionStorage flag.
- Hash configured via `NEXT_PUBLIC_DASHBOARD_PIN_HASH`. Falls back to
  the v1 hash for "1973" so dev works without env config.
- Set the GH repo secret `DASHBOARD_PIN_HASH` for production.

## Local Studio server (optional)
Thumbnails AI backgrounds and Studio video features call
`http://localhost:5555` (Python `studio_server.py` from v1-archive).
Both tabs detect when the server is offline and degrade gracefully —
do not break this contract when extending.

## Deploy
- GH Actions: `.github/workflows/deploy.yml` builds with
  `NEXT_PUBLIC_BASE_PATH=/fwp-analytics-dashboard` and publishes
  `out/` to GitHub Pages on every push to `main`.
- Add `.nojekyll` to the artifact (already in the workflow).

## Persisted client state (Zustand)
Single store under `fwp_dashboard_v2`:
- `deals` (Brand Deals tab)
- `flows` (ManyChat)
- `calendar` (Content Calendar)
- `creators` (Creator Research)
- `contentQueue` (Content Studio)
- `studioFolder` (Studio source path)

PIN auth uses `sessionStorage["fwp_auth"]`, separate from the store.
