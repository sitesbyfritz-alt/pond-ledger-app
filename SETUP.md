# PondLedger — setup & run

A complete, runnable Next.js scaffold for the PondLedger app. Local-first (no backend, no accounts).

## Run it

```bash
cd PondLedger
npm install
npm run dev          # http://localhost:3000
```

Open `/` for the landing page and `/dashboard` for a working demo (it seeds sample ponds the first time and shows live cost/kg, FCR, biomass and survival — proof the whole pipeline works).

```bash
npm run test:run     # run the calculation unit tests (13 passing)
npm run typecheck    # TypeScript strict check
npm run build        # production build (PWA/service worker enabled here)
```

## What's included

```
PondLedger/
├─ PondLedger_ClaudeCode_BuildPrompt.md   # paste into Claude Code to build the full app
├─ CLAUDE.md                              # repo guardrails Claude Code must follow
├─ SETUP.md / README_STARTER.md           # this + file-placement notes
├─ app/
│  ├─ globals.css        # design tokens (dark-first, water-teal + gold)
│  ├─ layout.tsx         # fonts, providers, PWA metadata
│  ├─ providers.tsx      # TanStack Query
│  ├─ page.tsx           # landing (runnable)
│  └─ dashboard/page.tsx # demo dashboard wired to the real calc engine
├─ lib/
│  ├─ types.ts           # Zod schemas + types (source of truth)
│  ├─ db.ts              # Dexie / IndexedDB schema
│  ├─ repository.ts      # the ONLY data-access layer (sync-ready) + backup export/import
│  ├─ calculations.ts    # pure, tested profit/FCR engine
│  ├─ calculations.test.ts
│  ├─ format.ts          # money (kobo→₦) / weight / % formatters
│  ├─ seed.ts            # demo data
│  └─ utils.ts           # cn() class helper (shadcn)
├─ public/
│  ├─ manifest.webmanifest
│  └─ icons/             # 192 + 512 PWA icons (placeholder — swap for real brand art)
├─ docs/                 # the product spec (docx + pdf)
├─ config: package.json, tsconfig.json, next.config.mjs (PWA), tailwind.config.ts,
│          postcss.config.mjs, vitest.config.ts, components.json, .eslintrc.json,
│          .gitignore, .env.example
```

## Tell Claude Code

> Read `PondLedger_ClaudeCode_BuildPrompt.md` and `CLAUDE.md`, and everything in `lib/` and `app/`. The scaffold runs already. Build the real product starting at Milestone 1 (the bento-grid dashboard), reusing the calc engine and repository. Pause for my review after each milestone.

## Notes

- **No env needed.** The only optional variable enables the AI insight panel (`.env.example`).
- **Add shadcn/ui components** as you go: `npx shadcn@latest add button card ...` (`components.json` is preconfigured).
- **Icons** in `public/icons` are simple placeholders — replace with real brand artwork before launch.
- Versions are pinned to a stable, well-supported set (Next 14, React 18, Tailwind 3). Upgrade later if you like.
