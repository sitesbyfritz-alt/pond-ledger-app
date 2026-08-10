# PondLedger — Claude Code Build Prompt

> Paste everything below the line into Claude Code as your opening prompt. It's written to be handed straight to the agent. Build it in stages — don't try to one-shot the whole thing; follow the milestone order at the end.

---

## ROLE

You are a senior full-stack product engineer and product designer. You're building **PondLedger**, a premium, offline-first web app that helps catfish farmers know the real cost and profitability of every pond in real time. Treat this like a flagship, venture-backed product: the kind of polish and depth you'd expect from Linear, Stripe, Mercury, or Vercel — but for aquaculture. Every screen should feel considered, fast, and expensive. No template smell. No generic Bootstrap/AI-default look.

Think and work like a staff engineer: make surgical, well-reasoned decisions, keep the architecture clean, and prefer a small number of excellent, composable pieces over sprawl. Ask me before introducing heavy dependencies I didn't request.

## THE PRODUCT IN ONE LINE

Catfish farming lives and dies on feed. Feed is 60–70% of cost, and the two numbers that decide profit — feed conversion ratio (FCR) and true cost-per-kg — are invisible when records live in a notebook. PondLedger makes those numbers visible *while the cycle is still running*, so the farmer acts on facts, not guesses, and never gets low-balled by a middleman again.

## PRIMARY USER

A catfish farmer in Nigeria running several ponds/tanks at different stages, mostly on a phone, often on patchy internet. Design assumption: **if daily logging takes more than 30 seconds, it won't get used.** Mobile-first, thumb-friendly, works offline. But the app must also look stunning on desktop for reviewing analytics and reports.

---

## TECH STACK (use exactly this unless you flag a better option first)

- **Framework:** Next.js (App Router) + TypeScript, strict mode
- **Styling:** Tailwind CSS + **shadcn/ui** (Radix primitives). Extend the theme; don't ship stock component styling.
- **Animation:** Framer Motion (page transitions, number count-ups, layout animations, gesture feedback)
- **Charts:** Recharts (or visx if you need finer control) — custom-styled, never default colors
- **Icons:** lucide-react
- **Fonts:** a distinctive pairing — display face for headings (e.g. Geist, Satoshi, or Clash Display), Inter/Geist for UI. Load via next/font.
- **Data / persistence: LOCAL-FIRST, NO SERVER.** All data lives on the device in the browser via **IndexedDB (Dexie.js)**. No cloud, no accounts required, no monthly cost — the app is fully usable offline out of the box. This suits the primary user (one farmer, one phone, patchy internet) perfectly.
- **Sync-ready architecture (important):** put ALL data access behind a repository/data-access layer (e.g. a `Repository` interface with a `DexieRepository` implementation). Do NOT let UI/components touch Dexie directly. This way a cloud/sync backend (Supabase or similar) can be added later by writing a second implementation — with zero UI rewrite. Design the schema now so records carry `id` (UUID), `createdAt`, `updatedAt`, and a soft-delete flag to make future sync straightforward.
- **Backup & restore:** since data is local, provide a rock-solid **Export to file** (full JSON backup of all tables) and **Import from file** (restore/merge) in Settings. Consider an optional auto-export reminder. This is the user's safety net — make it prominent and reliable.
- **Offline:** installable **PWA** — service worker, app shell caching, works with zero signal. Because storage is already local, there's no write queue to manage; just persist immediately with optimistic UI and a subtle "saved" confirmation.
- **State/data:** TanStack Query (with the Dexie repository as its data source) for caching/invalidation; Zustand for lightweight UI state.
- **Validation:** Zod, shared between client and server.
- **Money:** store minor units (kobo) as integers; format with Intl.NumberFormat, default `en-NG` / `NGN` (₦). Multi-currency ready but NGN default.
- **Testing:** Vitest for calc logic (the FCR / cost-per-kg / break-even math must be unit-tested), Playwright for one critical happy-path e2e.
- **Deploy:** Vercel-ready.

---

## DESIGN DIRECTION — "trillion-dollar" look

This is non-negotiable polish. Aim for the feeling of a beautifully engineered fintech dashboard that happens to be about fish.

**Mood:** calm, precise, premium. Deep water tones with a warm "value/naira" accent. Dark mode first-class, elegant light mode too.

**Palette (define as CSS variables / Tailwind theme tokens):**
- Base dark: near-black with a cool blue undertone (e.g. `#0A0E14` bg, `#121821` surfaces)
- Primary / water: a deep-to-bright aqua-teal ramp (e.g. `#0FB5A6` → `#5EEAD4`)
- Value accent: warm gold/amber for money-positive moments (e.g. `#F5B54A`)
- Semantic: profit-green, loss-red, warning-amber, info-blue — muted and sophisticated, not neon
- Generous neutral gray ramp for text hierarchy

**Type & layout:**
- Big, confident display headings; tight, readable body. Strong typographic hierarchy.
- Generous whitespace and an 8px spacing system. Rounded-2xl cards, soft layered shadows, subtle 1px borders with low-opacity strokes.
- **Bento-grid dashboard** as the home screen: KPI tiles, mini charts, and "needs attention" cards arranged like a control center.
- Depth via subtle gradients, glass surfaces (backdrop-blur used tastefully), and layered elevation — not flat and not gaudy.

**Motion & feel:**
- Framer Motion page/route transitions; shared-layout animations for cards.
- Animated number count-ups on KPIs; charts that draw in on mount.
- Skeleton loaders (never spinners on full pages); optimistic writes with a tiny "saved / will sync" pill.
- Haptic-style micro-interactions on the mobile quick-entry (button press states, satisfying confirm).
- Tasteful empty states with a single clear CTA — every empty state is a chance to teach.

**Quality bar:** dark/light parity, full keyboard nav, focus-visible states, WCAG AA contrast, 60fps interactions, and a mobile bottom-nav + FAB for the daily log. It should look like something you'd screenshot for a launch.

---

## FEATURE SET

### Core (build first)
1. **Onboarding (no accounts)** — no login required; data is local to the device. Optional **PIN / biometric lock** to protect the app on a shared phone. A short, gorgeous onboarding wizard: create farm → set currency & default feed price → add first pond → stock first cycle. Farmer is logging within 2 minutes. (Keep an `owner`/profile record locally so a future login can attach to it.)
2. **Ponds** — add/edit ponds (name, type: earthen/concrete/tarpaulin/tank, capacity). Card + list views. Status per pond (empty / active cycle / ready to harvest).
3. **Cycles** — a grow-out cycle per pond: stocking date, fingerling count, fingerling unit cost, species=catfish, target harvest weight, target harvest date.
4. **30-second daily log** — the heart of the app. Per pond, per day: feed given (kg + auto-priced from default, editable), mortalities, optional note/photo. Big inputs, remembers yesterday, one-tap repeat. FAB from anywhere.
5. **Sample weighing** — periodic average-weight entry; used to compute growth and FCR.
6. **Live pond intelligence** — for each active cycle, always answer "what is a kilo of fish costing me right now?": live **FCR**, **cost-per-kg**, survival %, biomass estimate, days in cycle, feed used to date.

### Money & decisions (the differentiators)
7. **Break-even vs market** — enter today's market price; app shows margin per kg and whether a middleman's offer is above or below break-even. A clear green/red verdict.
8. **Profit simulator ("what-if")** — sliders for FCR, feed price, sell price, mortality → instantly recomputed projected profit for the cycle. Make it feel alive.
9. **Optimal harvest planner** — using growth trend + feed cost + current price, flag the window where marginal feed cost starts exceeding marginal weight value. Recommend a harvest date with reasoning.
10. **Feed inventory** — track feed stock by type/brand/pellet size; deduct on each log; low-stock alerts; reorder list; feed price history so cost-per-kg reflects reality.
11. **Full expense ledger** — not just feed: fingerlings, labor, power/fuel, meds, water, misc → true per-cycle P&L, not a feed-only estimate.
12. **Sales & buyer ledger** — record harvests and sales by channel (middleman / direct / restaurant / retail), price achieved, buyer contacts, and price history so the farmer sees which channel actually pays best.

### Analytics & insight
13. **Portfolio dashboard** — bento grid across all ponds: total biomass, blended cost-per-kg, cash tied up in feed, ponds needing attention, projected revenue, best/worst performing cycle.
14. **Trends & charts** — FCR trend, cost-per-kg over time, growth curve vs target curve, mortality curve, feed spend. Beautiful, custom-styled.
15. **Cycle benchmarking** — compare finished cycles side by side; surface what the best cycle did differently.
16. **Mortality & disease watch** — tag mortality causes; spike detection with a gentle alert; simple pattern hints.
17. **AI insight panel** — plain-language summaries: "Pond B's FCR jumped to 2.1 this week — feed cost per kg is up 18%. At today's ₦ price you're ₦140/kg under break-even." (Wire to an LLM call; keep it optional and cheap.)

### Ops & delight
18. **Reminders/tasks** — feeding schedule, sampling reminders, harvest-window nudges. Local notifications; WhatsApp/email hooks stubbed for later.
19. **Reports export** — investor-grade PDF + CSV per cycle and per farm (the same numbers, presentation-ready).
20. **Offline everything** — the entire app works with no signal since data is local; installable PWA; clear "saved" feedback.
21. **Settings** — currency, default feed price, units, dark/light, farm profile, PIN lock, and prominent **Export backup / Import backup** (full JSON). Show last-backup date and nudge if it's stale.
22. **Multi-farm / roles & sync ready** — data layer, schema (UUID ids, timestamps, soft-delete), and repository abstraction designed so cloud sync and worker roles (owner/worker) can be added later without a UI rewrite.

Copy tone throughout: plain, confident, farmer-friendly English. No jargon walls. Explain FCR and cost-per-kg inline the first time they appear.

---

## KEY CALCULATIONS (unit-test these)

- **Biomass estimate** = surviving_fish × latest_average_weight
- **Surviving fish** = stocked_count − cumulative_mortalities
- **Survival %** = surviving_fish / stocked_count × 100
- **Weight gained** = current_biomass − initial_biomass (initial ≈ stocked_count × fingerling_weight)
- **FCR** = total_feed_kg_to_date ÷ weight_gained_kg
- **Total cost to date** = feed_cost + fingerling_cost + other_expenses
- **Cost-per-kg (break-even)** = total_cost_to_date ÷ current_biomass_kg
- **Margin per kg** = market_price_per_kg − cost_per_kg
- **Projected cycle profit** = (projected_biomass × sell_price) − projected_total_cost
- **Marginal harvest signal**: compare the value of the next unit of weight gain (Δweight × price) against the feed cost to produce it (Δfeed × feed_price); recommend harvest when the latter consistently exceeds the former.

Guard every division against zero/empty data with sensible "not enough data yet" states. Store money as integer minor units; round only at display.

---

## DATA MODEL (Dexie / IndexedDB tables — local-first)

Define these as Dexie tables with typed interfaces (Zod schemas shared with the UI). Every record carries `id` (UUID), `createdAt`, `updatedAt`, and `deletedAt` (soft delete) so a future sync layer is trivial. Store money as integer minor units (kobo). Photos: store as Blobs in IndexedDB (or object URLs), not base64 strings.

- **profile** (id, name) — local owner
- **farms** (id, name, currency default 'NGN', defaultFeedPriceKobo)
- **farmMembers** (farmId, name, role: owner|worker) — future-proofing (local only for now)
- **ponds** (id, farmId, name, type, capacity, status)
- **cycles** (id, pondId, species='catfish', stockingDate, fingerlingCount, fingerlingUnitCostKobo, fingerlingWeightG, targetWeightG, targetHarvestDate, status: active|harvested|closed)
- **feedItems** (id, farmId, brand, pelletSizeMm, unit, pricePerKgKobo, stockKg)
- **feedLogs** (id, cycleId, date, feedItemId, feedKg, feedCostKobo, note, photoBlob)
- **mortalityLogs** (id, cycleId, date, count, cause)
- **weightSamples** (id, cycleId, date, avgWeightG, sampleSize)
- **expenses** (id, cycleId | farmId, date, category, amountKobo, note)
- **marketPrices** (id, farmId, date, pricePerKgKobo, source)
- **sales** (id, cycleId, date, channel, kg, pricePerKgKobo, buyerName, buyerContact)
- **reminders** (id, farmId, type, dueAt, done)

Index by the foreign keys you query on (e.g. `feedLogs` by `[cycleId+date]`). Wrap all access in the repository layer. **Backup format:** a single versioned JSON document containing every table, produced by Export and consumed by Import (with a clear merge/replace choice and a schema-version field for forward compatibility).

---

## SCREENS

1. **Onboarding wizard** (4 quick steps, animated progress)
2. **Dashboard / portfolio** (bento grid, KPIs, attention cards)
3. **Pond detail** (live intelligence, charts, timeline of logs, cycle controls)
4. **Daily log** (the FAB flow — fastest path in the app)
5. **Profit simulator** (interactive sliders)
6. **Harvest planner** (recommendation + reasoning + confirm)
7. **Feed inventory**
8. **Expenses**
9. **Sales & buyers**
10. **Analytics** (trends, benchmarking)
11. **Reports** (export)
12. **Settings**

Mobile: bottom nav (Dashboard · Ponds · [FAB: Log] · Analytics · More). Desktop: elegant sidebar. Command palette (⌘K) on desktop for power users.

---

## MILESTONES (build and check in this order — pause after each for my review)

1. **Foundation** — Next.js + TS + Tailwind + shadcn set up; design tokens, fonts, dark/light, layout shell, bottom-nav + sidebar, one polished dummy dashboard. Nail the *look* first.
2. **Data layer** — Dexie schema + Zod types + the repository abstraction (`Repository` interface + `DexieRepository`) + onboarding wizard + optional PIN lock. Include Export/Import backup early so no data is ever at risk.
3. **Core loop** — ponds, cycles, daily log, sample weights, live pond intelligence with real calculations (unit-tested).
4. **Money & decisions** — break-even, profit simulator, harvest planner, feed inventory, expenses, sales ledger.
5. **Analytics & insight** — portfolio dashboard, trend charts, benchmarking, mortality watch, AI insight panel.
6. **PWA & polish** — installable PWA + app-shell caching, reminders, reports export, empty states, motion pass, a11y pass, performance pass. (Cloud sync is explicitly out of scope for v1 — the repository layer leaves the door open.)

## ACCEPTANCE CRITERIA

- At any moment, the farmer can open the app and instantly see what a kilo of fish in each pond is costing right now.
- Daily logging for one pond takes under 30 seconds on a phone, offline.
- All financial math is unit-tested and correct; no NaN/∞ leaks to the UI.
- Dark and light modes both look premium; AA contrast; full keyboard nav; 60fps interactions.
- Lighthouse: PWA installable, Performance and Accessibility ≥ 90 on mobile.
- Nothing looks templated. It should be screenshot-worthy for a launch.

## HOW TO WORK

- Start with milestone 1 and **show me the dashboard look before going further.**
- Keep a running `README.md` and `.env.example`; never commit secrets.
- Explain any non-obvious tradeoff in a sentence before you make it.
- Commit per milestone with clear messages.
- Prefer clarity over cleverness; keep components small and composable.

Now begin with Milestone 1.
