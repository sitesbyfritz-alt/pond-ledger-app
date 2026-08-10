// lib/analytics.ts
// PURE portfolio analytics + rule-based insights. No I/O, no React. Reuses the
// calc engine. Every metric is guarded; insights are deterministic so they can be
// unit-tested and shown offline (the optional LLM panel only *enhances* these).
import {
  fcr,
  costPerKgKobo,
  currentBiomassKg,
  survivalPct,
  latestAvgWeightG,
  marginPerKgKobo,
  daysInCycle,
  type CycleInput,
  type FeedLogInput,
  type MortalityInput,
  type WeightSampleInput,
  type ExpenseInput,
} from "./calculations";

export interface AnalyticsPond {
  id: string;
  name: string;
  cycle: CycleInput & { targetWeightG: number };
  feedLogs: FeedLogInput[];
  mortality: MortalityInput[];
  samples: WeightSampleInput[];
  expenses: ExpenseInput[];
}

export interface PondMetric {
  id: string;
  name: string;
  day: number;
  costPerKgKobo: number | null;
  fcr: number | null;
  survivalPct: number | null;
  biomassKg: number | null;
  marginPerKgKobo: number | null;
  mortalityCount: number;
  mortalityRatePct: number | null;
  /** latest avg weight as a % of target (0–100+), or null with no sample */
  targetProgressPct: number | null;
}

export function pondMetric(p: AnalyticsPond, marketPriceKobo: number | null): PondMetric {
  const fcrR = fcr(p.cycle, p.feedLogs, p.mortality, p.samples);
  const cpkR = costPerKgKobo(p.cycle, p.feedLogs, p.mortality, p.samples, p.expenses);
  const bioR = currentBiomassKg(p.cycle, p.mortality, p.samples);
  const survR = survivalPct(p.cycle.fingerlingCount, p.mortality);
  const avg = latestAvgWeightG(p.samples);
  const mortalityCount = p.mortality.reduce((s, m) => s + m.count, 0);

  const costPerKgKoboVal = cpkR.ok ? cpkR.value : null;
  const margin =
    costPerKgKoboVal !== null && marketPriceKobo !== null
      ? marginPerKgKobo(marketPriceKobo, costPerKgKoboVal)
      : null;

  return {
    id: p.id,
    name: p.name,
    day: daysInCycle(p.cycle.stockingDate),
    costPerKgKobo: costPerKgKoboVal,
    fcr: fcrR.ok ? fcrR.value : null,
    survivalPct: survR.ok ? survR.value : null,
    biomassKg: bioR.ok ? bioR.value : null,
    marginPerKgKobo: margin,
    mortalityCount,
    mortalityRatePct:
      p.cycle.fingerlingCount > 0 ? (mortalityCount / p.cycle.fingerlingCount) * 100 : null,
    targetProgressPct:
      avg !== null && p.cycle.targetWeightG > 0 ? (avg / p.cycle.targetWeightG) * 100 : null,
  };
}

export interface Insight {
  id: string;
  level: "good" | "warn" | "info";
  title: string;
  detail: string;
}

/** Deterministic, explainable findings ranked most-actionable first. */
export function insights(metrics: PondMetric[], marketPriceKobo: number | null): Insight[] {
  const out: Insight[] = [];
  const valued = metrics.filter((m) => m.costPerKgKobo !== null);

  // Losing money at current market price
  for (const m of metrics) {
    if (m.marginPerKgKobo !== null && m.marginPerKgKobo < 0) {
      out.push({
        id: `${m.id}-loss`,
        level: "warn",
        title: `${m.name} is under water`,
        detail: `Cost per kg is above market by ₦${Math.abs(Math.round(m.marginPerKgKobo / 100))}. Cut feed cost or hold for a better price.`,
      });
    }
  }

  // High mortality
  for (const m of metrics) {
    if (m.mortalityRatePct !== null && m.mortalityRatePct >= 10) {
      out.push({
        id: `${m.id}-mort`,
        level: "warn",
        title: `${m.name}: high mortality`,
        detail: `${m.mortalityRatePct.toFixed(0)}% of stock lost. Check water quality and feeding.`,
      });
    }
  }

  // Poor feed conversion
  for (const m of metrics) {
    if (m.fcr !== null && m.fcr > 2) {
      out.push({
        id: `${m.id}-fcr`,
        level: "warn",
        title: `${m.name}: feed conversion is high`,
        detail: `FCR ${m.fcr.toFixed(2)} — you're spending a lot of feed per kilo of gain.`,
      });
    }
  }

  // Ready to harvest
  for (const m of metrics) {
    if (m.targetProgressPct !== null && m.targetProgressPct >= 95) {
      out.push({
        id: `${m.id}-harvest`,
        level: "info",
        title: `${m.name} is at market size`,
        detail: `Fish are ~${m.targetProgressPct.toFixed(0)}% of target weight. Plan the harvest.`,
      });
    }
  }

  // Best performer (encouragement + benchmark)
  if (valued.length >= 2) {
    const best = [...valued].sort((a, b) => (a.costPerKgKobo as number) - (b.costPerKgKobo as number))[0];
    out.push({
      id: `${best.id}-best`,
      level: "good",
      title: `${best.name} is your cheapest producer`,
      detail: `₦${Math.round((best.costPerKgKobo as number) / 100)}/kg. Copy its feeding rhythm to the others.`,
    });
  }

  if (out.length === 0) {
    out.push({
      id: "all-clear",
      level: "good",
      title: "Everything looks healthy",
      detail: marketPriceKobo === null
        ? "Set a market price to unlock profit insights."
        : "No ponds need attention right now.",
    });
  }

  return out;
}
