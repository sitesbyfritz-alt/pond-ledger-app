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
