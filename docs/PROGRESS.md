# PondLedger — Session Progress & Handoff

_Last updated: 2026-08-10. Written so a fresh session can continue without this chat._

## TL;DR

All six build-prompt milestones are **built, unit-tested (51/51), production-built
(service worker generated), committed to git, and deployed by the user**. The app
runs and serves live and clean. Remaining work is polish + real-Chrome verification
(see "What's left").

Git: initialized this session, one commit `25a799e` ("feat: PondLedger … milestones
1-6"), branch `master`. User has pushed to their own GitHub repo and deployed.

## How to run

```bash
npm install          # if node_modules missing (Windows: never run two installs at once — corrupts swc)
npm run dev          # dev (needs network the FIRST time for next/font/google — see Gotchas)
npm run build        # production build; generates public/sw.js (PWA)
npx next start -p 3100   # serve the production build
npm run test:run     # 51 unit tests
npm run typecheck    # strict TS
```

Open the app → onboarding → "Explore with demo data" seeds 2 ponds and lands on the
dashboard. (Use real Chrome; the in-app preview pane sandboxes IndexedDB so seeding hangs there.)

## What was built (milestones 1–6)

- **M1 Foundation** — design tokens + Space Grotesk display font + dark/light theme
  toggle; app shell (`app/(app)/layout.tsx`): desktop sidebar, mobile bottom-nav + FAB,
  topbar with ⌘K stub; **bento dashboard** (`app/(app)/dashboard/page.tsx`) driven by the
  calc engine + `lib/portfolio.ts` (blended cost/kg, biomass, cash-in-feed, margin,
  cost/kg trend, per-pond cards, attention list). Count-ups, skeletons, reduced-motion.
- **M2 Data layer** — onboarding wizard (`app/onboarding/page.tsx`); **PIN screen-lock**
  (`lib/security.ts` salted SHA-256, `stores/session.ts`, `components/shell/lock-screen.tsx`,
  `app-gate.tsx`) stored in localStorage (no schema migration); **backup export/import**
  UI in `app/(app)/more/page.tsx` (repo already had the methods). Honest: PIN is a screen
  lock, NOT encryption.
- **M3 Core loop** — `hooks/use-pond-data.ts` (TanStack Query over the repository);
  ponds + cycles CRUD (`app/(app)/ponds/page.tsx` with sheets); **pond detail**
  (`app/(app)/ponds/[id]/page.tsx`) live intelligence via `lib/pond-view.ts`; **30-second
  daily log** (`app/(app)/log/page.tsx`) — feed-first, auto-cost, remembers yesterday,
  optional mortality/weight expanders.
- **M4 Money** — expenses + sales ledger + profit simulator + harvest advice on pond
  detail (`components/pond/*`); feed inventory + market price (`app/(app)/feed/page.tsx`);
  `lib/money.ts` (sales summary, realized net).
- **M5 Analytics** — `app/(app)/analytics/page.tsx`: cost/kg benchmark bars, mortality
  watch, rule-based insights, CSV export; engine `lib/analytics.ts`. AI panel is
  **feature-flagged** (`NEXT_PUBLIC_ENABLE_AI_INSIGHTS`) — see gap below.
- **M6 PWA + polish** — PWA was already wired by the scaffold (prod `next-pwa` +
  `public/manifest.webmanifest` + icons); derived reminders (`lib/reminders.ts`) on the
  log page; CSV report (`lib/report.ts`); skip-to-content link + `#main` landmark.

## Verification status

- ✅ `typecheck` green · ✅ **51/51 unit tests** (calculations, portfolio, pond-view,
  money, analytics, report, reminders, security, repository-backup-round-trip).
- ✅ `npm run build` exit 0 — 11 routes, lint+types validated in build, **`public/sw.js`
  generated** (scope `/`).
- ✅ `next start` serves live: HTTP 200, real HTML, **zero console errors** (after a clean
  `rm -rf .next` rebuild — see Gotchas).
- ⛔ NOT done: live click-through of the seeded dashboard, Lighthouse numbers, PWA
  install/offline check — all need **real Chrome** (preview pane can't).

## What's left (ranked)

1. **Live verify on the deployed URL** — walk dashboard → pond detail → log → expense/sale
   → simulator → analytics → CSV → backup export/import → PIN lock/unlock.
2. **Lighthouse** — capture real perf + a11y numbers (DoD asks for figures).
3. **PWA** — confirm install prompt + offline reload on the live URL.
4. **Real AI insight route** — GAP: the analytics "AI enhanced" badge is only a label.
   Only on-device rule-based insights exist; there is **no `/api/insights` LLM route**.
   Build one behind the existing flag if real AI summaries are wanted (key server-side).
5. **⌘K command palette** — currently a styled stub; wire real nav/actions.
6. **Finish close/harvest-cycle flow** end-to-end (mark harvested → history).
7. **Real brand icons** — `public/icons/*` are placeholders.
8. **Merge the fonts task** (separate worktree, not merged here) → clean rebuild; fixes
   offline-dev only. Non-issue in production.

## Key decisions (this session)

- PIN = screen lock via salted SHA-256 in localStorage; NOT data encryption (labeled
  honestly in UI). Chosen over full encryption to protect the 30-sec log speed + backup format.
- Onboarding offers "demo data" OR "start fresh".
- Money in integer **kobo**, weights in **grams**; convert only at display edge. All data
  access through the **repository** — no Dexie in components/UI.
- Fixed a pre-existing self-contradictory test (`calculations.test.ts` "refuses without
  growth") — edited the TEST fixture only, engine untouched.
- Added pure, tested modules for every new calc surface (portfolio, pond-view, money,
  analytics, report, reminders, security) — same discipline as the original engine.

## Gotchas / environment traps

- **Never run two `npm install`s at once on this Windows box** — corrupts
  `node_modules/@next/swc` + npm cache (`memory/windows-npm-no-overlap.md`). Overlap caused
  EPERM/ENOTEMPTY failures this session.
- **`next/font/google`** (Inter + Space Grotesk in `app/layout.tsx`) fetches CSS at
  BUILD/dev-compile time → dev/build **stalls when offline**. Fix = self-host via
  `next/font/local` (the pending fonts task). Production self-hosts once fetched.
- **Stale `.next` → `next start` 500s** on `Cannot find module './vendor-chunks/@tanstack.js'`.
  Fix: `rm -rf .next && npm run build`. Cause was a parallel worktree racing on `.next`.
- **In-app preview browser sandboxes IndexedDB** — demo seeding hangs there; use real Chrome.

## Files added/changed this session

`lib/`: portfolio, pond-view, money, analytics, report, reminders, security, app-settings
(+ tests). `stores/`: ui, session. `hooks/`: use-pond-data. `components/`: ui/{card,button,
field,sheet}, theme-toggle, shell/*, dashboard/*, pond/*. `app/`: layout (fonts),
globals.css, (app)/layout + dashboard/ponds/[id]/log/more/feed/analytics + onboarding.
Repository extended with profile/farm methods. See `git show 25a799e --stat`.
