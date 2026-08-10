// lib/portfolio.ts
// PURE portfolio aggregation across active cycles. No I/O, no Dexie, no React.
// Mirrors the calc-engine discipline: guard divisions, return explicit nulls
// (never NaN) when there isn't enough data yet. Unit-tested.
import {
  currentBiomassKg,
  totalCostKobo,
  totalFeedCostKobo,
  type CycleInput,
  type FeedLogInput,
  type MortalityInput,
  type WeightSampleInput,
  type ExpenseInput,
} from "./calculations";

/** Everything one pond's active cycle contributes to the portfolio. */
export interface PondSlice {
  cycle: CycleInput;
  feedLogs: FeedLogInput[];
  mortalityLogs: MortalityInput[];
  samples: WeightSampleInput[];
  expenses: ExpenseInput[];
}

export interface PortfolioInput {
  ponds: PondSlice[];
  /** Latest market price (kobo/kg) or null if none recorded. */
  marketPriceKobo: number | null;
}

export interface PortfolioSummary {
  activePonds: number;
  /** Ponds that have at least one weight sample (so biomass is known). */
  pondsWithBiomass: number;
  totalBiomassKg: number;
  cashInFeedKobo: number;
  /** Blended break-even: total cost / total biomass, over ponds with biomass.
   *  null until at least one pond has biomass. */
  blendedCostPerKgKobo: number | null;
  /** market price − blended cost/kg. null without market price or biomass. */
  marginPerKgKobo: number | null;
}

export function portfolioSummary(input: PortfolioInput): PortfolioSummary {
  let totalBiomassKg = 0;
  let costForPondsWithBiomassKobo = 0;
  let cashInFeedKobo = 0;
  let pondsWithBiomass = 0;

  for (const p of input.ponds) {
    cashInFeedKobo += totalFeedCostKobo(p.feedLogs);

    const bio = currentBiomassKg(p.cycle, p.mortalityLogs, p.samples);
    if (bio.ok && bio.value > 0) {
      pondsWithBiomass += 1;
      totalBiomassKg += bio.value;
      costForPondsWithBiomassKobo += totalCostKobo(p.cycle, p.feedLogs, p.expenses);
    }
  }

  const blendedCostPerKgKobo =
    totalBiomassKg > 0
      ? Math.round(costForPondsWithBiomassKobo / totalBiomassKg)
      : null;

  const marginPerKgKobo =
    blendedCostPerKgKobo !== null && input.marketPriceKobo !== null
      ? input.marketPriceKobo - blendedCostPerKgKobo
      : null;

  return {
    activePonds: input.ponds.length,
    pondsWithBiomass,
    totalBiomassKg,
    cashInFeedKobo,
    blendedCostPerKgKobo,
    marginPerKgKobo,
  };
}
