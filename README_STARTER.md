# PondLedger — starter kit

Drop-in files that give Claude Code a head start. Place them like this in your Next.js project:

```
your-project/
├─ CLAUDE.md                 ← repo guardrails (root)
└─ lib/
   ├─ types.ts               ← Zod schemas + inferred types (source of truth)
   ├─ db.ts                  ← Dexie / IndexedDB schema (local-first)
   ├─ repository.ts          ← the ONLY data access layer (sync-ready)
   ├─ calculations.ts        ← pure, tested profit/FCR engine
   └─ calculations.test.ts   ← Vitest tests (all passing)
```

## Install deps

```bash
npm i dexie zod @tanstack/react-query zustand
npm i -D vitest
```

## Run the tests

```bash
npx vitest run
```

All calculation tests pass (survivors, biomass, FCR, break-even cost/kg, margin, harvest advice, projection, days-in-cycle). The numbers match the worked example in the spec: 900 kg biomass, FCR 1.5, break-even ₦3,000/kg, and a ₦540,000 projected profit at a ₦3,600/kg sell price.

## How to use with Claude Code

1. Put `CLAUDE.md` at the repo root and the `lib/*` files in `lib/`.
2. Open the full build prompt (`PondLedger_ClaudeCode_BuildPrompt.md`) and paste it as your first message.
3. Tell it: "The starter files in `lib/` and `CLAUDE.md` are already in place — build on them, starting with Milestone 1."

## Key rules baked in

- Money is integer **kobo**; weights in **grams** — convert only at the display edge.
- Components never touch Dexie directly — always go through `repo` (the `Repository` interface). That's what makes cloud sync a later drop-in with no UI rewrite.
- The calc engine is pure and returns explicit "not enough data" results instead of `NaN`.
- Export/Import backup is the user's safety net — build it early.
