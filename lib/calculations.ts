// lib/calculations.ts
// PURE calculation engine. No I/O, no Dexie, no React. Every function is unit-tested.
// Units: money in integer kobo; weights in grams (avgWeightG) or kg (feedKg) as named.
// All divisions are guarded — functions that can lack data return a Result, never NaN.

export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const no = (reason: string): Result<never> => ({ ok: false, reason });

// ---- Minimal input shapes (decoupled from Zod records for pure testing) ----
export interface CycleInput {
  fingerlingCount: number;
  fingerlingUnitCostKobo: number;
  fingerlingWeightG: number;
  stockingDate: string; // YYYY-MM-DD
}
export interface FeedLogInput { feedKg: number; feedCostKobo: number }
export interface MortalityInput { count: number }
export interface WeightSampleInput { date: string; avgWeightG: number }
export interface ExpenseInput { amountKobo: number }

// ---- Population ----
export function survivingFish(stocked: number, mortalityLogs: MortalityInput[]): number {
  const dead = mortalityLogs.reduce((s, m) => s + m.count, 0);
  return Math.max(0, stocked - dead);
}

export function survivalPct(stocked: number, mortalityLogs: MortalityInput[]): Result<number> {
  if (stocked <= 0) return no("No fish stocked");
  return ok((survivingFish(stocked, mortalityLogs) / stocked) * 100);
}

/** Most recent sample by date, or null if none. */
export function latestAvgWeightG(samples: WeightSampleInput[]): number | null {
  if (samples.length === 0) return null;
  return [...samples].sort((a, b) => b.date.localeCompare(a.date))[0].avgWeightG;
}

// ---- Biomass (kg) ----
export function initialBiomassKg(cycle: CycleInput): number {
  return (cycle.fingerlingCount * cycle.fingerlingWeightG) / 1000;
}

export function currentBiomassKg(
  cycle: CycleInput,
  mortalityLogs: MortalityInput[],
  samples: WeightSampleInput[]
): Result<number> {
  const avgG = latestAvgWeightG(samples);
  if (avgG === null) return no("Add a weight sample to estimate biomass");
  const survivors = survivingFish(cycle.fingerlingCount, mortalityLogs);
  return ok((survivors * avgG) / 1000);
}

export function weightGainedKg(
  cycle: CycleInput,
  mortalityLogs: MortalityInput[],
  samples: WeightSampleInput[]
): Result<number> {
  const current = currentBiomassKg(cycle, mortalityLogs, samples);
  if (!current.ok) return current;
  const gain = current.value - initialBiomassKg(cycle);
  return ok(gain);
}

// ---- Feed ----
export function totalFeedKg(feedLogs: FeedLogInput[]): number {
  return feedLogs.reduce((s, f) => s + f.feedKg, 0);
}
export function totalFeedCostKobo(feedLogs: FeedLogInput[]): number {
  return feedLogs.reduce((s, f) => s + f.feedCostKobo, 0);
}

/** FCR = feed given / weight gained. Needs positive weight gain. */
export function fcr(
  cycle: CycleInput,
  feedLogs: FeedLogInput[],
  mortalityLogs: MortalityInput[],
  samples: WeightSampleInput[]
): Result<number> {
  const gain = weightGainedKg(cycle, mortalityLogs, samples);
  if (!gain.ok) return gain;
  if (gain.value <= 0) return no("Not enough growth recorded yet");
  return ok(totalFeedKg(feedLogs) / gain.value);
}

// ---- Cost ----
export function fingerlingCostKobo(cycle: CycleInput): number {
  return cycle.fingerlingCount * cycle.fingerlingUnitCostKobo;
}

export function totalCostKobo(
  cycle: CycleInput,
  feedLogs: FeedLogInput[],
  expenses: ExpenseInput[]
): number {
  const other = expenses.reduce((s, e) => s + e.amountKobo, 0);
  return totalFeedCostKobo(feedLogs) + fingerlingCostKobo(cycle) + other;
}

/** Break-even: total cost so far / current biomass (kg). Kobo per kg. */
export function costPerKgKobo(
  cycle: CycleInput,
  feedLogs: FeedLogInput[],
  mortalityLogs: MortalityInput[],
  samples: WeightSampleInput[],
  expenses: ExpenseInput[]
): Result<number> {
  const biomass = currentBiomassKg(cycle, mortalityLogs, samples);
  if (!biomass.ok) return biomass;
  if (biomass.value <= 0) return no("No live biomass to value");
  return ok(Math.round(totalCostKobo(cycle, feedLogs, expenses) / biomass.value));
}

/** Positive = profit per kg at this market price. */
export function marginPerKgKobo(marketPriceKobo: number, costPerKg: number): number {
  return marketPriceKobo - costPerKg;
}

// ---- Projection ----
export interface ProjectionInput {
  cycle: CycleInput;
  feedLogs: FeedLogInput[];
  mortalityLogs: MortalityInput[];
  samples: WeightSampleInput[];
  expenses: ExpenseInput[];
  projectedTargetWeightG: number; // e.g. cycle.targetWeightG
  projectedFcr: number; // expected FCR to reach target (e.g. current or 1.5)
  feedPricePerKgKobo: number;
  sellPricePerKgKobo: number;
}

/** Projected end-of-cycle profit (kobo) at target weight. */
export function projectedCycleProfitKobo(p: ProjectionInput): Result<number> {
  const survivors = survivingFish(p.cycle.fingerlingCount, p.mortalityLogs);
  if (survivors <= 0) return no("No surviving fish");
  const projectedBiomassKg = (survivors * p.projectedTargetWeightG) / 1000;
  const currentBio = currentBiomassKg(p.cycle, p.mortalityLogs, p.samples);
  const currentBioKg = currentBio.ok ? currentBio.value : initialBiomassKg(p.cycle);

  const remainingGainKg = Math.max(0, projectedBiomassKg - currentBioKg);
  const remainingFeedKg = remainingGainKg * p.projectedFcr;
  const remainingFeedCost = remainingFeedKg * p.feedPricePerKgKobo;

  const projectedTotalCost = totalCostKobo(p.cycle, p.feedLogs, p.expenses) + remainingFeedCost;
  const projectedRevenue = projectedBiomassKg * p.sellPricePerKgKobo;
  return ok(Math.round(projectedRevenue - projectedTotalCost));
}

// ---- Harvest timing ----
export interface HarvestAdvice {
  recommendHarvest: boolean;
  marginalFeedCostKobo: number; // cost to grow the next kg
  marginalValueKobo: number; // value of the next kg at market
  message: string;
}

/**
 * Compare the cost of producing the next kg of gain (feedPrice * FCR)
 * against its market value (sellPrice). When cost >= value, growing further loses money.
 */
export function harvestAdvice(
  currentFcr: number,
  feedPricePerKgKobo: number,
  sellPricePerKgKobo: number
): HarvestAdvice {
  const marginalFeedCostKobo = Math.round(currentFcr * feedPricePerKgKobo);
  const marginalValueKobo = sellPricePerKgKobo;
  const recommendHarvest = marginalFeedCostKobo >= marginalValueKobo;
  return {
    recommendHarvest,
    marginalFeedCostKobo,
    marginalValueKobo,
    message: recommendHarvest
      ? "Growing further costs more in feed than the extra weight is worth — consider harvesting."
      : "Each extra kilo still earns more than it costs to feed — keep growing.",
  };
}

// ---- Misc ----
export function daysInCycle(stockingDate: string, today = new Date()): number {
  const start = new Date(stockingDate + "T00:00:00");
  const ms = today.getTime() - start.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/** Display helper (kept here so tests can assert formatting rules). */
export function koboToNaira(kobo: number): number {
  return kobo / 100;
}
export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(
    koboToNaira(kobo)
  );
}
