// lib/pond-view.ts
// PURE per-pond intelligence bundle. No I/O, no React. Composes the calc engine
// into everything a pond screen needs, so the detail page and log confirmation
// share one tested source of truth. Divisions stay guarded (Result), never NaN.
import {
  fcr,
  costPerKgKobo,
  currentBiomassKg,
  survivalPct,
  totalFeedKg,
  totalCostKobo,
  marginPerKgKobo,
  harvestAdvice,
  daysInCycle,
  type Result,
  type CycleInput,
  type FeedLogInput,
  type MortalityInput,
  type WeightSampleInput,
  type ExpenseInput,
} from "./calculations";

/** Cycle fields the view needs beyond the pure CycleInput. */
export interface ViewCycle extends CycleInput {
  targetWeightG: number;
}

export interface DatedFeedLog extends FeedLogInput {
  date: string;
}
export interface DatedMortality extends MortalityInput {
  date: string;
}

export interface PondViewInput {
  cycle: ViewCycle;
  feedLogs: DatedFeedLog[];
  mortality: DatedMortality[];
  samples: WeightSampleInput[];
  expenses: ExpenseInput[];
  marketPriceKobo: number | null;
  feedPricePerKgKobo: number;
}

export interface PondView {
  day: number;
  costPerKgKobo: Result<number>;
  fcr: Result<number>;
  biomassKg: Result<number>;
  survivalPct: Result<number>;
  totalFeedKg: number;
  totalCostKobo: number;
  marginPerKgKobo: number | null;
  harvest: ReturnType<typeof harvestAdvice> | null;
  /** oldest → newest weight samples for the growth curve */
  growth: { date: string; avgWeightG: number }[];
  /** cost/kg (naira) at each sample date, for the trend chart */
  costTrend: { label: string; costPerKgNaira: number }[];
}

export function computePondView(input: PondViewInput): PondView {
  const { cycle, feedLogs, mortality, samples, expenses, marketPriceKobo, feedPricePerKgKobo } = input;

  const cpk = costPerKgKobo(cycle, feedLogs, mortality, samples, expenses);
  const fcrR = fcr(cycle, feedLogs, mortality, samples);
  const bio = currentBiomassKg(cycle, mortality, samples);
  const surv = survivalPct(cycle.fingerlingCount, mortality);

  const margin =
    cpk.ok && marketPriceKobo !== null ? marginPerKgKobo(marketPriceKobo, cpk.value) : null;

  const harvest =
    fcrR.ok && marketPriceKobo !== null
      ? harvestAdvice(fcrR.value, feedPricePerKgKobo, marketPriceKobo)
      : null;

  const growth = [...samples]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({ date: s.date, avgWeightG: s.avgWeightG }));

  const costTrend: PondView["costTrend"] = [];
  growth.forEach((g, i) => {
    const upto = <T extends { date: string }>(rows: T[]) => rows.filter((r) => r.date <= g.date);
    const r = costPerKgKobo(cycle, upto(feedLogs), upto(mortality), upto(samples), expenses);
    if (r.ok) costTrend.push({ label: `wk ${i + 1}`, costPerKgNaira: r.value / 100 });
  });

  return {
    day: daysInCycle(cycle.stockingDate),
    costPerKgKobo: cpk,
    fcr: fcrR,
    biomassKg: bio,
    survivalPct: surv,
    totalFeedKg: totalFeedKg(feedLogs),
    totalCostKobo: totalCostKobo(cycle, feedLogs, expenses),
    marginPerKgKobo: margin,
    harvest,
    growth,
    costTrend,
  };
}
