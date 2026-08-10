# PondLedger — Milestone 1: Foundation + Bento Dashboard

Date: 2026-08-09
Status: Approved (design), in implementation.

## Goal

Deliver Milestone 1 from the build prompt: design tokens + fonts + dark/light + a
premium app shell (desktop sidebar, mobile bottom-nav + FAB) + one polished
bento-grid dashboard wired to the existing calc engine. "Nail the look first."

Build ON the existing, tested calc engine (`lib/calculations.ts`) and repository
(`lib/repository.ts`). Do not rewrite them.

## Non-goals (later milestones)

Real onboarding, daily-log form, pond detail, analytics pages, working ⌘K palette,
PWA polish. These get thin placeholder routes only, so nav never dead-ends.

## Foundation

- Add **Space Grotesk** (display) via `next/font/google` → `--font-display`; keep
  Inter for `--font-sans`. Wire both in `app/layout.tsx`.
- Keep existing tokens in `app/globals.css`. Add reusable component classes
  (`.surface-hover`, KPI/bento helpers) and keep dark-first.
- **Theme toggle**: Zustand store toggles `dark` class on `<html>`, persisted to
  localStorage, hydration-safe. Light + dark both must look premium.
- Money stays integer kobo, weights integer grams; convert only at display edge
  via `lib/format.ts`.

## App shell — `app/(app)/layout.tsx` (route group, URLs unchanged)

- Single `nav-items` config drives desktop sidebar AND mobile bottom-nav.
- Nav: Dashboard (live), Ponds, Analytics, More → placeholder routes.
- Mobile center **FAB = "Log"** → `/log` placeholder (the daily-log fast path,
  built in Milestone 3).
- Topbar: farm name, theme toggle, and a **⌘K stub** button (styled, opens a
  "coming soon" note). Building the real palette now is scope creep.
- Accessible: keyboard-navigable, focus-visible, aria-current on active nav.

## Bento dashboard — `app/(app)/dashboard/page.tsx`

Reuse the existing seed → repo → calc pipeline. Aggregate across active cycles via
a new **pure, unit-tested** module `lib/portfolio.ts` (no I/O, mirrors calc-engine
discipline; guards divisions, returns explicit "not enough data").

Layout (responsive bento):
- Row 1 — 4 KPI tiles: **Blended cost/kg** (gold value accent), **Total biomass**,
  **Cash in feed**, **Portfolio margin vs market** (profit-green / loss-red).
- Row 2 — **Cost/kg trend** mini area chart (Recharts, custom teal gradient,
  draws in) + **Needs attention** card (near-harvest, missing weight sample,
  mortality spike).
- Row 3 — per-pond cards: big cost/kg, FCR, biomass, survival, day-in-cycle,
  verdict pill, sparkline. Click → `/ponds/[id]` stub.

## Motion & states

- Framer Motion: staggered card fade-up on mount, KPI number **count-ups**,
  chart draw-in. Honor `prefers-reduced-motion`.
- **Skeletons** while loading (never a full-page spinner); no layout shift.
- Every calc `Result` guarded → render "—" + reason, never NaN/∞.
- Empty state (no ponds): teaching CTA "Add your first pond".

## New files

```
stores/ui.ts
lib/portfolio.ts  +  lib/portfolio.test.ts
components/ui/{card,button}.tsx
components/theme-toggle.tsx
components/shell/{nav-items.ts,sidebar.tsx,bottom-nav.tsx,topbar.tsx,fab.tsx}
components/dashboard/{count-up,kpi-tile,pond-card,attention-card,cost-trend-chart}.tsx
app/(app)/layout.tsx
app/(app)/dashboard/page.tsx        (replaces app/dashboard/page.tsx)
app/(app)/{ponds,analytics,more,log}/page.tsx   (placeholders)
```

## Definition of done

TS strict green · `portfolio.ts` tests green · dark + light both premium ·
keyboard-nav + focus-visible · no NaN leaks · no console errors · skeletons in
place (no CLS) · 60fps motion. Verified by running dev + a screenshot.
