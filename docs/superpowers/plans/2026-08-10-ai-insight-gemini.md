# AI Insight Route (Google Gemini) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in AI narrative summary to the analytics page, powered by Google Gemini through a server route, sitting above the existing on-device rule insights without ever replacing them.

**Architecture:** A pure payload builder (`lib/ai-insights.ts`) converts already-computed `PondMetric[]` into an aggregates-only, Zod-validated object. A server route handler (`app/api/insights/route.ts`) calls Gemini with the key held server-side. The `InsightPanel` in the analytics page gains a "Generate summary" button gated by a one-time consent stored in `lib/app-settings.ts` (localStorage). Every failure path falls back to the existing deterministic bullets.

**Tech Stack:** Next.js 14 App Router (route handlers) · TypeScript strict · Zod 3 · `@google/genai` · Vitest 2 · Framer Motion · Tailwind/shadcn.

## Global Constraints

- **Local-first, additive only.** No code path where enabling AI removes/degrades the on-device insights. App fully usable with no key, offline.
- **Aggregates only leave the device.** Per-pond: `day, costPerKgNaira, fcr, survivalPct, marginPerKgNaira, mortalityRatePct, targetProgressPct` + `marketPriceNaira`. Never raw feed/mortality/sales/expense logs.
- **Money stored in kobo, weights in grams.** Convert kobo→naira only at the payload edge: `Math.round(kobo / 100)`. Percentages pass through unchanged.
- **Key never reaches the browser.** `GOOGLE_API_KEY` read only inside the route handler.
- **No Dexie schema change.** Consent persists in localStorage via `lib/app-settings.ts`, guarded for SSR.
- **TypeScript strict, no `any` without a written reason. No hard deletes. No console errors.**
- **Model env-swappable:** `GEMINI_MODEL`, default `gemini-2.5-flash`.
- Test runner: `npm run test:run` (Vitest). Typecheck: `npm run typecheck`.

---

### Task 1: Aggregates-only payload builder + Zod schema

**Files:**
- Create: `lib/ai-insights.ts`
- Test: `lib/ai-insights.test.ts`

**Interfaces:**
- Consumes: `PondMetric` from `@/lib/analytics` (fields: `id, name, day, costPerKgKobo, fcr, survivalPct, marginPerKgKobo, mortalityRatePct, targetProgressPct` — all metric numbers nullable except `day`, `mortalityCount`).
- Produces:
  - `interface InsightPayloadPond { name?: string; label: string; day: number; costPerKgNaira: number | null; fcr: number | null; survivalPct: number | null; marginPerKgNaira: number | null; mortalityRatePct: number | null; targetProgressPct: number | null; }`
  - `interface InsightPayload { ponds: InsightPayloadPond[]; marketPriceNaira: number | null; }`
  - `function buildInsightPayload(metrics: PondMetric[], marketPriceKobo: number | null, opts: { includeNames: boolean }): InsightPayload`
  - `const insightPayloadSchema: z.ZodType<InsightPayload>` (used by Task 3 to validate the request body)

- [ ] **Step 1: Write the failing test**

```ts
// lib/ai-insights.test.ts
import { describe, it, expect } from "vitest";
import { buildInsightPayload, insightPayloadSchema } from "./ai-insights";
import type { PondMetric } from "./analytics";

const metric = (over: Partial<PondMetric> = {}): PondMetric => ({
  id: "p1",
  name: "Pond 1",
  day: 60,
  costPerKgKobo: 36_000,
  fcr: 1.5,
  survivalPct: 100,
  biomassKg: 500,
  marginPerKgKobo: 264_000,
  mortalityCount: 0,
  mortalityRatePct: 0,
  targetProgressPct: 50,
  ...over,
});

describe("buildInsightPayload", () => {
  it("converts kobo to whole naira at the edge", () => {
    const p = buildInsightPayload([metric()], 300_000, { includeNames: true });
    expect(p.marketPriceNaira).toBe(3_000);
    expect(p.ponds[0].costPerKgNaira).toBe(360);
    expect(p.ponds[0].marginPerKgNaira).toBe(2_640);
    expect(p.ponds[0].fcr).toBe(1.5);
    expect(p.ponds[0].survivalPct).toBe(100);
  });

  it("includes names when asked and always a positional label", () => {
    const p = buildInsightPayload([metric({ name: "Backyard" })], null, { includeNames: true });
    expect(p.ponds[0].name).toBe("Backyard");
    expect(p.ponds[0].label).toBe("Pond 1");
  });

  it("omits names when anonymous, keeps positional label", () => {
    const p = buildInsightPayload([metric({ name: "Backyard" })], null, { includeNames: false });
    expect(p.ponds[0].name).toBeUndefined();
    expect(p.ponds[0].label).toBe("Pond 1");
  });

  it("passes nulls through, never NaN", () => {
    const p = buildInsightPayload(
      [metric({ costPerKgKobo: null, marginPerKgKobo: null, targetProgressPct: null })],
      null,
      { includeNames: true },
    );
    expect(p.ponds[0].costPerKgNaira).toBeNull();
    expect(p.ponds[0].marginPerKgNaira).toBeNull();
    expect(p.ponds[0].targetProgressPct).toBeNull();
    expect(p.marketPriceNaira).toBeNull();
  });

  it("produces payloads that satisfy the schema", () => {
    const p = buildInsightPayload([metric(), metric({ id: "p2" })], 300_000, { includeNames: true });
    expect(insightPayloadSchema.safeParse(p).success).toBe(true);
  });

  it("schema rejects a raw-log field sneaking in", () => {
    const bad = { ponds: [{ label: "Pond 1", day: 1, feedKg: 10 }], marketPriceNaira: null };
    expect(insightPayloadSchema.safeParse(bad).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- lib/ai-insights.test.ts`
Expected: FAIL — cannot find module `./ai-insights`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/ai-insights.ts
// PURE builder: PondMetric[] -> aggregates-only, Zod-validated payload for the AI route.
// No I/O, no React, no Dexie. Money kobo->naira only here; percentages pass through.
import { z } from "zod";
import type { PondMetric } from "./analytics";

export interface InsightPayloadPond {
  name?: string;
  label: string;
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

const nairaFromKobo = (kobo: number | null): number | null =>
  kobo === null ? null : Math.round(kobo / 100);

export function buildInsightPayload(
  metrics: PondMetric[],
  marketPriceKobo: number | null,
  opts: { includeNames: boolean },
): InsightPayload {
  return {
    marketPriceNaira: nairaFromKobo(marketPriceKobo),
    ponds: metrics.map((m, i) => ({
      ...(opts.includeNames ? { name: m.name } : {}),
      label: `Pond ${i + 1}`,
      day: m.day,
      costPerKgNaira: nairaFromKobo(m.costPerKgKobo),
      fcr: m.fcr,
      survivalPct: m.survivalPct,
      marginPerKgNaira: nairaFromKobo(m.marginPerKgKobo),
      mortalityRatePct: m.mortalityRatePct,
      targetProgressPct: m.targetProgressPct,
    })),
  };
}

const nn = z.number().nullable();
const pondSchema = z
  .object({
    name: z.string().optional(),
    label: z.string(),
    day: z.number(),
    costPerKgNaira: nn,
    fcr: nn,
    survivalPct: nn,
    marginPerKgNaira: nn,
    mortalityRatePct: nn,
    targetProgressPct: nn,
  })
  .strict(); // rejects any unexpected field (e.g. a raw-log leak)

export const insightPayloadSchema: z.ZodType<InsightPayload> = z
  .object({
    ponds: z.array(pondSchema).max(50),
    marketPriceNaira: nn,
  })
  .strict();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- lib/ai-insights.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/ai-insights.ts lib/ai-insights.test.ts
git commit -m "feat: pure aggregates-only payload builder + zod schema for AI insights"
```

---

### Task 2: AI consent in app-settings

**Files:**
- Modify: `lib/app-settings.ts` (append new keys + accessors)
- Test: `lib/app-settings.test.ts` (create)

**Interfaces:**
- Consumes: existing `read`/`write` helpers in `lib/app-settings.ts` (module-private — reuse the pattern, do not export them).
- Produces:
  - `type AiConsent = "unset" | "aggregates" | "anonymous" | "declined"`
  - `function getAiConsent(): AiConsent`
  - `function setAiConsent(value: AiConsent): void`

- [ ] **Step 1: Write the failing test**

```ts
// lib/app-settings.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { getAiConsent, setAiConsent } from "./app-settings";

beforeEach(() => localStorage.clear());

describe("aiConsent", () => {
  it("defaults to unset", () => {
    expect(getAiConsent()).toBe("unset");
  });

  it("persists a chosen value", () => {
    setAiConsent("anonymous");
    expect(getAiConsent()).toBe("anonymous");
  });

  it("treats a corrupt value as unset", () => {
    localStorage.setItem("pl-ai-consent", "garbage");
    expect(getAiConsent()).toBe("unset");
  });
});
```

- [ ] **Step 2: Ensure the test env has localStorage; run to verify it fails**

Run: `npm run test:run -- lib/app-settings.test.ts`
Expected: If it errors with `localStorage is not defined`, add the jsdom environment directive as the FIRST line of the test file:

```ts
// @vitest-environment jsdom
```

Re-run. Expected now: FAIL — `getAiConsent` / `setAiConsent` not exported.

- [ ] **Step 3: Write minimal implementation**

In `lib/app-settings.ts`, add `aiConsent: "pl-ai-consent"` to the `KEYS` object, then append at the end of the file:

```ts
export type AiConsent = "unset" | "aggregates" | "anonymous" | "declined";

const AI_CONSENT_VALUES: readonly AiConsent[] = [
  "unset",
  "aggregates",
  "anonymous",
  "declined",
];

export function getAiConsent(): AiConsent {
  const raw = read(KEYS.aiConsent);
  return AI_CONSENT_VALUES.includes(raw as AiConsent) ? (raw as AiConsent) : "unset";
}

export function setAiConsent(value: AiConsent): void {
  write(KEYS.aiConsent, value === "unset" ? null : value);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- lib/app-settings.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/app-settings.ts lib/app-settings.test.ts
git commit -m "feat: persist AI consent state in app-settings (localStorage, no schema change)"
```

---

### Task 3: Gemini server route

**Files:**
- Create: `app/api/insights/route.ts`
- Test: `app/api/insights/route.test.ts`
- Modify: `package.json` (add `@google/genai` dependency)

**Interfaces:**
- Consumes: `insightPayloadSchema` from `@/lib/ai-insights`; `GoogleGenAI` from `@google/genai`.
- Produces: `POST(req: Request): Promise<Response>`. Response bodies: `200 { summary: string }`, `400 { error: "bad_request" }`, `422 { error: "no_summary" }`, `502 { error: "ai_error" }`, `503 { error: "ai_unavailable" }`.

- [ ] **Step 1: Install the SDK (single install — never run two npm installs at once on this box)**

Run: `npm install @google/genai`
Expected: adds `@google/genai` to `dependencies`, exits 0.

- [ ] **Step 2: Write the failing test (mock the SDK and env)**

```ts
// app/api/insights/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const generateContent = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(() => ({ models: { generateContent } })),
}));

import { POST } from "./route";

const validBody = {
  ponds: [{ label: "Pond 1", day: 60, costPerKgNaira: 360, fcr: 1.5, survivalPct: 100, marginPerKgNaira: 2640, mortalityRatePct: 0, targetProgressPct: 50 }],
  marketPriceNaira: 3000,
};
const req = (body: unknown) =>
  new Request("http://x/api/insights", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  generateContent.mockReset();
  delete process.env.GOOGLE_API_KEY;
});

describe("POST /api/insights", () => {
  it("503 when no key", async () => {
    const res = await POST(req(validBody));
    expect(res.status).toBe(503);
  });

  it("400 on a bad body", async () => {
    process.env.GOOGLE_API_KEY = "k";
    const res = await POST(req({ ponds: [{ label: "x", day: 1, feedKg: 9 }], marketPriceNaira: null }));
    expect(res.status).toBe(400);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("200 with the model summary on success", async () => {
    process.env.GOOGLE_API_KEY = "k";
    generateContent.mockResolvedValue({ text: "  Pond 1 is profitable. Hold the harvest a week.  " });
    const res = await POST(req(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ summary: "Pond 1 is profitable. Hold the harvest a week." });
  });

  it("422 when the model returns no text", async () => {
    process.env.GOOGLE_API_KEY = "k";
    generateContent.mockResolvedValue({ text: "" });
    const res = await POST(req(validBody));
    expect(res.status).toBe(422);
  });

  it("502 when the SDK throws", async () => {
    process.env.GOOGLE_API_KEY = "k";
    generateContent.mockRejectedValue(new Error("quota"));
    const res = await POST(req(validBody));
    expect(res.status).toBe(502);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:run -- app/api/insights/route.test.ts`
Expected: FAIL — cannot find module `./route`.

- [ ] **Step 4: Write minimal implementation**

```ts
// app/api/insights/route.ts
// Server-only. Reads GOOGLE_API_KEY (never sent to the browser), validates an
// aggregates-only payload, asks Gemini for one short narrative paragraph.
// Every failure returns a status the client treats as "keep the on-device bullets".
import { GoogleGenAI } from "@google/genai";
import { insightPayloadSchema } from "@/lib/ai-insights";

export const runtime = "nodejs";

const SYSTEM_INSTRUCTION =
  "You are a Nigerian catfish-farming P&L analyst. Given these per-pond metrics, " +
  "write ONE short paragraph (max 4 sentences) a smallholder farmer can act on today. " +
  "Use Naira and plain language. No preamble, no bullet points, no markdown headings.";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request): Promise<Response> {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return json({ error: "ai_unavailable" }, 503);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const parsed = insightPayloadSchema.safeParse(raw);
  if (!parsed.success) return json({ error: "bad_request" }, 400);

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const res = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
      contents: JSON.stringify(parsed.data),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        maxOutputTokens: 400,
        temperature: 0.4,
      },
    });
    const summary = res.text?.trim();
    if (!summary) return json({ error: "no_summary" }, 422);
    return json({ summary }, 200);
  } catch {
    return json({ error: "ai_error" }, 502);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:run -- app/api/insights/route.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: exit 0. If `@google/genai` types differ (e.g. `.text` is a method or the config key differs), adjust the call to match the installed SDK's types — the request path and status codes must stay identical.

- [ ] **Step 7: Commit**

```bash
git add app/api/insights/route.ts app/api/insights/route.test.ts package.json package-lock.json
git commit -m "feat: /api/insights Gemini route (aggregates-only, key server-side, graceful failures)"
```

---

### Task 4: Consent dialog + Generate button in InsightPanel

**Files:**
- Modify: `app/(app)/analytics/page.tsx` (the `InsightPanel` component + its call site)

**Interfaces:**
- Consumes: `buildInsightPayload` from `@/lib/ai-insights`; `getAiConsent`, `setAiConsent`, type `AiConsent` from `@/lib/app-settings`; existing `pondMetric` metrics array already computed in `AnalyticsPage`.
- Produces: no new exports — self-contained UI wiring.

- [ ] **Step 1: Pass the metrics and market price into `InsightPanel`**

In `app/(app)/analytics/page.tsx`, change the render call from:

```tsx
<InsightPanel insights={insightList} />
```

to:

```tsx
<InsightPanel insights={insightList} metrics={metrics} marketPriceKobo={data?.marketPriceKobo ?? null} />
```

- [ ] **Step 2: Add imports at the top of the file**

Add to the existing import block:

```tsx
import { useState } from "react";
import { buildInsightPayload } from "@/lib/ai-insights";
import { getAiConsent, setAiConsent, type AiConsent } from "@/lib/app-settings";
import { pondMetric } from "@/lib/analytics";
```

(`pondMetric` is already imported — keep one import only. `useMemo` is already imported; add `useState` to that React import if a `react` import line exists, otherwise add the line above.)

- [ ] **Step 3: Replace the `InsightPanel` component**

Replace the whole existing `function InsightPanel(...) { ... }` with:

```tsx
function InsightPanel({
  insights,
  metrics,
  marketPriceKobo,
}: {
  insights: Insight[];
  metrics: ReturnType<typeof pondMetric>[];
  marketPriceKobo: number | null;
}) {
  const [summary, setSummary] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [askConsent, setAskConsent] = useState(false);
  const aiEnabled = AI_ENABLED;

  async function generate(consent: Exclude<AiConsent, "unset" | "declined">) {
    setStatus("loading");
    setSummary(null);
    try {
      const payload = buildInsightPayload(metrics, marketPriceKobo, {
        includeNames: consent === "aggregates",
      });
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { summary: string };
      setSummary(data.summary);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  function onGenerateClick() {
    const consent = getAiConsent();
    if (consent === "aggregates" || consent === "anonymous") {
      void generate(consent);
    } else {
      setAskConsent(true);
    }
  }

  function choose(consent: AiConsent) {
    setAiConsent(consent);
    setAskConsent(false);
    if (consent === "aggregates" || consent === "anonymous") void generate(consent);
  }

  const badgeLabel = summary ? "AI enhanced" : aiEnabled ? "AI ready" : "On-device";

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-value" />
          <h2 className="font-display text-sm font-semibold">Insights</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3" /> {badgeLabel}
        </span>
      </div>

      {aiEnabled && (
        <div className="mt-4">
          {summary ? (
            <motion.p
              key={summary}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-xl bg-secondary/40 px-3 py-3 text-sm leading-relaxed"
            >
              {summary}
            </motion.p>
          ) : status === "loading" ? (
            <div className="h-16 animate-pulse rounded-xl bg-secondary" />
          ) : null}

          <div className="mt-3 flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onGenerateClick} disabled={status === "loading"}>
              <Sparkles className="h-4 w-4" /> {summary ? "Regenerate" : "Generate summary"}
            </Button>
            {status === "error" && (
              <span className="text-[11px] text-muted-foreground">AI summary unavailable — showing on-device insights.</span>
            )}
          </div>
        </div>
      )}

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {insights.map((ins, i) => (
          <motion.li
            key={ins.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            className="flex items-start gap-3 rounded-xl bg-secondary/50 px-3 py-3"
          >
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ background: `hsl(var(--${ins.level === "good" ? "profit" : ins.level === "warn" ? "warning" : "primary"}))` }}
            />
            <div>
              <p className="text-sm font-medium leading-tight">{ins.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{ins.detail}</p>
            </div>
          </motion.li>
        ))}
      </ul>

      {!aiEnabled && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          These run entirely on your device. Add an AI key to enable deeper written analysis.
        </p>
      )}

      {askConsent && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <Card className="max-w-sm">
            <h3 className="font-display text-base font-semibold">Send summary numbers to AI?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This sends your farm&apos;s <strong>summary numbers</strong> (cost/kg, survival, feed conversion) — <strong>not</strong> your
              daily logs — to Google&apos;s AI to write a plain-language summary. Your pond names can be excluded.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button size="sm" onClick={() => choose("aggregates")}>Include pond names</Button>
              <Button variant="outline" size="sm" onClick={() => choose("anonymous")}>Exclude names</Button>
              <Button variant="ghost" size="sm" onClick={() => choose("declined")}>Not now</Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `npm run typecheck`
Expected: exit 0.
Run: `npm run lint`
Expected: no errors (apostrophes are already escaped as `&apos;`).

- [ ] **Step 5: Verify in the browser (dev server via preview tools, real Chrome — the in-app preview sandboxes IndexedDB)**

Start the dev server (`.claude/launch.json` already defines it), open the analytics page after seeding demo data. Confirm:
- With **no** `GOOGLE_API_KEY` set: bullets render; clicking "Generate summary" → consent dialog → choose Include names → "AI summary unavailable" note appears, bullets intact, **no console errors**.
- Toggle dark/light: paragraph area, dialog, and button all render with AA contrast.

Capture a screenshot of the panel for the summary.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/analytics/page.tsx"
git commit -m "feat: consent-gated Generate summary button + AI paragraph above on-device bullets"
```

---

### Task 5: Env, docs, and full green build

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Update `.env.example`**

Replace its contents with:

```
# PondLedger runs fully offline with NO backend and NO required env vars.
# The only optional key powers the AI Insight panel (Google Gemini summaries).
# Leave it blank and the app runs fine — the AI panel is feature-flagged off.

# Optional: enable the AI insight panel
NEXT_PUBLIC_ENABLE_AI_INSIGHTS=false
# Google Gemini API key — kept server-side in the /api/insights route handler, never sent to the browser
GOOGLE_API_KEY=
# Optional model override (default: gemini-2.5-flash)
GEMINI_MODEL=gemini-2.5-flash
```

- [ ] **Step 2: Document the feature in `README.md`**

Add a short "AI insight panel (optional)" subsection under the existing setup/architecture notes:

```markdown
### AI insight panel (optional)

The analytics page can generate a one-paragraph plain-language summary via Google Gemini.
It is off unless `NEXT_PUBLIC_ENABLE_AI_INSIGHTS=true` and `GOOGLE_API_KEY` are set.
The key lives only in the `/api/insights` server route (a Netlify function) — never in the browser.
Only aggregated metrics (cost/kg, FCR, survival, margin) are sent, never raw logs, and only after
a one-time in-app consent. With no key or when offline, the app falls back to the on-device rule insights.
```

- [ ] **Step 3: Full suite + typecheck + build**

Run: `npm run test:run`
Expected: all tests pass (prior 51 + Task 1's 6 + Task 2's 3 + Task 3's 5 = 65).
Run: `npm run typecheck`
Expected: exit 0.
Run: `npm run build`
Expected: exit 0, route `/api/insights` listed as a function (ƒ) in the build output, service worker still generated.

- [ ] **Step 4: Commit**

```bash
git add .env.example README.md
git commit -m "docs: document optional Gemini AI insight panel + env keys"
```

---

## Self-review notes

- **Spec coverage:** payload builder (Task 1), route + status codes (Task 3), consent state (Task 2), consent dialog + button + narrative + fallback + badge (Task 4), env + README + dep (Tasks 3/5). All spec sections mapped.
- **Type consistency:** `buildInsightPayload(metrics, marketPriceKobo, { includeNames })` and `insightPayloadSchema` names identical across Tasks 1, 3, 4. `AiConsent` / `getAiConsent` / `setAiConsent` identical across Tasks 2 and 4. Route contract (`{ summary }`, statuses) identical across Tasks 3 and 4.
- **Fallback bar:** Task 4 keeps the bullet `<ul>` outside every AI conditional — it renders regardless of key/consent/error. Meets the "additive only" non-negotiable.
- **Windows trap:** Task 3 Step 1 is the only `npm install`; do not run it concurrently with any other install (see `memory/windows-npm-no-overlap.md`).
