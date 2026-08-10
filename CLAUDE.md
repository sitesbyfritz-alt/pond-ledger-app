# CLAUDE.md — PondLedger

Project rules and guardrails for building **PondLedger**, a premium, local-first web app that shows catfish farmers the real cost and profitability of every pond in real time. Read this before writing code. Follow it exactly.

## Product north star

At any moment the farmer can open the app and instantly see **what a kilo of fish in each pond is costing right now**. Daily logging on a phone, offline, takes under 30 seconds. If a change makes either of those worse, don't ship it.

## Non-negotiables

- **Local-first. No server, no accounts in v1.** All data lives on the device in IndexedDB via Dexie. The app must be fully usable with zero internet.
- **All data access goes through the repository layer** (`Repository` interface). UI and components must NEVER import Dexie directly. This is what lets us add cloud sync later with no UI rewrite.
- **Every record carries** `id` (UUID v4), `createdAt`, `updatedAt`, `deletedAt` (soft delete, null when live). No hard deletes in normal flows.
- **Money is stored as integer minor units (kobo).** Never store or compute money as floats. Convert to naira only at the display edge with `Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' })`.
- **Weights are stored in grams (integer).** Convert to kg at the display/calc edge. Be explicit about units in every variable name (`feedKg`, `avgWeightG`).
- **The calculation engine (`lib/calculations.ts`) is pure and unit-tested.** No I/O, no Dexie, no React inside it. Every formula has a Vitest test. Guard every division against zero and return an explicit "not enough data" state rather than `NaN`/`Infinity`.
- **Backup is sacred.** Export/Import (full JSON) must work and be covered by a test. Never let a schema migration risk user data — bump `SCHEMA_VERSION` and handle upgrades in Dexie's `version().upgrade()`.

## Tech stack (don't swap without asking)

Next.js (App Router) + TypeScript strict · Tailwind + shadcn/ui · Framer Motion · Recharts · lucide-react · Dexie.js (IndexedDB) · TanStack Query (over the repository) · Zustand (UI state) · Zod (validation, shared) · Vitest (unit) · Playwright (one e2e) · PWA (next-pwa or a hand-rolled service worker).

## Design bar

Premium fintech-dashboard feel (Linear / Stripe / Mercury). Dark-first with elegant light mode. Water-teal primary, warm-gold value accent. Bento-grid dashboard. Framer Motion transitions + number count-ups. Skeleton loaders, never full-page spinners. Mobile bottom-nav + FAB for the daily log; desktop sidebar + ⌘K palette. WCAG AA, focus-visible, 60fps. **Nothing may look templated.**

## Architecture & conventions

- Folder shape: `app/` (routes), `components/` (ui + feature), `lib/` (db, repository, calculations, types, format), `stores/` (zustand), `hooks/`.
- Types & validation live in `lib/types.ts` as Zod schemas; derive TS types with `z.infer`. Validate all writes.
- Data hooks (TanStack Query) wrap repository calls; components consume hooks, not the repo or Dexie.
- Keep components small and composable. Prefer server components where they help, but this app is client-heavy by nature (IndexedDB is client-side).
- Dates stored as ISO strings (`YYYY-MM-DD` for day-granular logs, full ISO for timestamps).
- IDs via `crypto.randomUUID()`.

## Coding principles (Karpathy-style)

- Make the smallest change that fully solves the task. No speculative abstractions.
- Surface assumptions in a one-line comment or message before making a non-obvious call.
- Define "done" as a verifiable check (a test, a Lighthouse number, a screenshot) — not a vibe.
- Don't overcomplicate. If a feature needs a comment to explain cleverness, prefer the simpler version.

## Definition of done (per feature)

- TypeScript strict passes, no `any` without a written reason.
- Calc logic changed → tests added/updated and green.
- Works offline; write persists and shows "saved".
- Dark + light both look right; keyboard-navigable; AA contrast.
- No console errors; no layout shift on load (skeletons in place).

## Build order (pause for review after each milestone)

1. Foundation + design system + dummy dashboard (nail the look first).
2. Data layer: Dexie schema + repository + types + onboarding + PIN lock + **Export/Import backup**.
3. Core loop: ponds, cycles, daily log, weight samples, live pond intelligence (calc-driven).
4. Money & decisions: break-even, profit simulator, harvest planner, feed inventory, expenses, sales ledger.
5. Analytics & insight: portfolio dashboard, trends, benchmarking, mortality watch, AI insight panel.
6. PWA + polish: installable, reminders, reports export, motion/a11y/perf passes.

## Explicitly out of scope for v1

Cloud sync, multi-device, worker logins, IoT/sensors, marketplace, SMS/WhatsApp sending. The schema and repository must leave the door open for these, but do not build them.

## Housekeeping

- Keep `README.md` current (setup, scripts, architecture).
- `.env.example` only; never commit secrets. The only likely secret is an optional LLM key for the AI insight panel — feature-flag it so the app runs without it.
- Conventional commits, one per milestone slice.
