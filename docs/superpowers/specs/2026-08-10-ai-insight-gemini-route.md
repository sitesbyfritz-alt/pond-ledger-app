# AI Insight Route (Google Gemini) — Design

_Date: 2026-08-10. Milestone 5 gap-closer. Written so a fresh session can implement without this chat._

## Problem

The analytics page (`app/(app)/analytics/page.tsx`) shows an "AI enhanced" badge, but no LLM route exists — only the on-device rule-based insights in `lib/analytics.ts`. This closes that gap: a real AI narrative summary, powered by **Google Gemini**, that sits **above** the existing deterministic bullets and never replaces them.

## Product decision

The AI panel outputs **one short narrative paragraph** (≤4 sentences) interpreting the whole farm — "Pond A is your cheapest producer, Pond B is under water on feed, hold the harvest a week." It is additive: the 51-tested on-device bullets remain the reliable base and the offline/error fallback. AI only ever *adds* a paragraph.

Not built (YAGNI for v1): per-pond AI, Q&A chatbot, action lists.

## Non-negotiables carried from CLAUDE.md

- **Local-first stays intact.** The app is fully usable with zero internet and no key. AI is strictly opt-in and additive.
- **Repository layer untouched.** This feature reads already-computed `PondMetric[]` (from `lib/analytics.ts`) — it does not touch Dexie or the repository.
- **Money in kobo, weights in grams** internally; convert to naira/kg only at the payload edge.
- **Pure calc modules stay pure and tested.** The payload builder is pure and unit-tested.

## Privacy model (the important part)

PondLedger's identity is "your data stays on your device." An LLM route crosses that boundary, so:

- **Explicit opt-in.** AI panel is off until the farmer taps **Generate summary** AND grants a one-time consent. Consent persists in `lib/app-settings.ts` (localStorage — no Dexie schema bump, same pattern as the PIN lock).
- **Aggregates only.** Only computed metrics leave the device: per-pond `day, costPerKgNaira, fcr, survivalPct, marginPerKgNaira, mortalityRatePct, targetProgressPct` + `marketPriceNaira`. **Never** raw feed logs, mortality events, sales, or expenses.
- **Names optional.** Consent offers "Include names" or "Exclude names"; when excluded the client sends `Pond 1 / Pond 2 …` positional labels.
- **Key never reaches the browser.** `GOOGLE_API_KEY` is read only inside the server route handler.

Consent states: `"unset" | "aggregates" | "anonymous" | "declined"`.

## Deployment

Deployed on **Netlify**, which runs Next.js route handlers as serverless functions — so a server route is feasible. `GOOGLE_API_KEY` and `GEMINI_MODEL` set in Netlify env. No static export is configured (`next.config` has no `output: "export"`), so nothing to change there.

## Architecture

Three new units + edits to two existing files.

### 1. `lib/ai-insights.ts` (new, pure, tested)

```ts
export interface InsightPayloadPond {
  name?: string;          // omitted when consent is "anonymous"
  label: string;          // "Pond 1" positional fallback, always present
  day: number;
  costPerKgNaira: number | null;
  fcr: number | null;
  survivalPct: number | null;
  marginPerKgNaira: number | null;
  mortalityRatePct: number | null;
  targetProgressPct: number | null;
}
export interface InsightPayload {
  ponds: InsightPayloadPond[];
  marketPriceNaira: number | null;
}
export function buildInsightPayload(
  metrics: PondMetric[],
  marketPriceKobo: number | null,
  opts: { includeNames: boolean },
): InsightPayload;
```

- Pure: no I/O, no React, no Dexie. Converts kobo→naira and keeps grams-derived pcts as-is.
- `includeNames: false` → omit `name`, keep positional `label`.
- Guards nulls (a metric that is `null` stays `null`, never `NaN`).
- **Zod schema** `insightPayloadSchema` exported from here (or `lib/types.ts`) and used by the route to validate the request body at the boundary.

Unit tests (`lib/ai-insights.test.ts`): kobo→naira conversion, name inclusion/exclusion, null passthrough, empty-metrics case.

### 2. `app/api/insights/route.ts` (new, server-only)

`POST` handler. Runtime: Node (Netlify function). Never statically rendered.

Flow:
1. `const key = process.env.GOOGLE_API_KEY;` — if missing → `503 { error: "ai_unavailable" }`.
2. Parse JSON body; validate with `insightPayloadSchema`. Invalid → `400 { error: "bad_request" }`. Enforce a sane pond-count cap (e.g. ≤ 50) to bound payload size.
3. Build prompt:
   - **System instruction:** "You are a Nigerian catfish-farming P&L analyst. Given these per-pond metrics, write ONE short paragraph (max 4 sentences) a smallholder farmer can act on today. Use Naira and plain language. No preamble, no bullet points, no markdown headings."
   - **Content:** JSON-stringified payload.
4. Call Gemini via `@google/genai`:
   ```ts
   import { GoogleGenAI } from "@google/genai";
   const ai = new GoogleGenAI({ apiKey: key });
   const res = await ai.models.generateContent({
     model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
     contents: prompt,
     config: { systemInstruction, maxOutputTokens: 400, temperature: 0.4 },
   });
   const summary = res.text?.trim();
   ```
5. Empty/blocked response (safety block or no text) → `422 { error: "no_summary" }`.
6. Success → `200 { summary }`.
7. Any thrown error (network, quota, SDK) → `502 { error: "ai_error" }`. Never leak the key or raw provider error to the client.

The route imports nothing from Dexie/repository — it is a stateless transform of the request body.

> Note: exact `@google/genai` package name / `gemini-2.5-flash` model string may have moved since Jan 2026. Model is env-configurable (`GEMINI_MODEL`); if the SDK surface differs, adapt the call — the request/response contract with the client stays the same.

### 3. `lib/app-settings.ts` (edit)

Add `aiConsent: "unset" | "aggregates" | "anonymous" | "declined"` (default `"unset"`), with get/set persisted to localStorage. No Dexie schema change.

### 4. `app/(app)/analytics/page.tsx` — `InsightPanel` (edit)

- Add a **"Generate summary"** button in the panel header.
- On click:
  1. Read `aiConsent`. If `"unset"` → open a one-time consent dialog:
     > "This sends your farm's **summary numbers** (cost/kg, survival, feed conversion) — **not** your daily logs — to Google's AI to write a plain-language summary. Your pond names can be excluded."
     Buttons: **Include names** (`"aggregates"`) · **Exclude names** (`"anonymous"`) · **Not now** (`"declined"`). Persist choice.
  2. If consent is `"declined"` → do nothing (button still present for later).
  3. Otherwise: build payload via `buildInsightPayload(metrics, marketPriceKobo, { includeNames: consent === "aggregates" })`, `POST /api/insights`.
- Loading → skeleton line (not a spinner). Error / non-200 → silently keep the bullets, small muted "AI summary unavailable" note.
- Success → render the paragraph above the bullet list with a fade/count-up, matching the existing Framer Motion feel. Cache in component state; button becomes "Regenerate".
- Badge shows "AI enhanced" only after a successful summary this session; otherwise "On-device".

### 5. `.env.example` (edit)

```
# Optional: enable the AI insight panel (Google Gemini). App runs fully without it.
NEXT_PUBLIC_ENABLE_AI_INSIGHTS=false
GOOGLE_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

## Fallback guarantee (the safety contract)

The on-device rule insights render unchanged when ANY of: flag off, no key (`503`), offline, consent declined, `422`/`502`/`400`, or client-side fetch failure. There is no code path where enabling AI removes or degrades the deterministic insights. This is the acceptance bar.

## Definition of done

- `npm run typecheck` green, no new `any`.
- `lib/ai-insights.test.ts` added and green (payload builder).
- Route returns correct status codes for: no key, bad body, success (mocked), provider error (mocked). At least a light unit test of the handler's branching (mock the SDK).
- Consent dialog appears once, persists, and gates the fetch.
- With no key set: analytics page still renders, bullets intact, "Generate summary" surfaces the graceful "unavailable" note — no console errors.
- Dark + light both render the new paragraph and dialog; keyboard-navigable; AA contrast.
- `package.json` gains `@google/genai`; `README.md` + `.env.example` document the optional key.

## Out of scope

Streaming the summary, caching summaries across sessions/devices, per-pond AI, Q&A, any write-back to the repository, multi-provider abstraction. Keep it one route, one paragraph.
