import { describe, it, expect } from "vitest";
import { portfolioSummary, type PondSlice } from "./portfolio";
import type { CycleInput } from "./calculations";

const cycle = (over: Partial<CycleInput> = {}): CycleInput => ({
  fingerlingCount: 1000,
  fingerlingUnitCostKobo: 5000, // ₦50
  fingerlingWeightG: 5,
  stockingDate: "2026-01-01",
  ...over,
});

// A pond with a weight sample -> known biomass.
const grownPond = (): PondSlice => ({
  cycle: cycle(),
  // 100 kg feed at ₦1300/kg = ₦130,000 = 13,000,000 kobo
  feedLogs: [{ feedKg: 100, feedCostKobo: 13_000_000 }],
  mortalityLogs: [{ count: 0 }],
  // 1000 fish * 500g = 500,000g = 500 kg
  samples: [{ date: "2026-03-01", avgWeightG: 500 }],
  expenses: [],
});

// A freshly stocked pond with no weight sample -> no biomass yet.
const freshPond = (): PondSlice => ({
  cycle: cycle({ fingerlingCount: 600 }),
  feedLogs: [{ feedKg: 10, feedCostKobo: 1_300_000 }],
  mortalityLogs: [],
  samples: [],
  expenses: [],
});

describe("portfolioSummary", () => {
  it("aggregates biomass, cash-in-feed, and blended cost/kg", () => {
    const s = portfolioSummary({
      ponds: [grownPond()],
      marketPriceKobo: 300_000, // ₦3000/kg
    });
    expect(s.activePonds).toBe(1);
    expect(s.pondsWithBiomass).toBe(1);
    expect(s.totalBiomassKg).toBeCloseTo(500);
    // cost = feed 13,000,000 + fingerlings 1000*5000 = 5,000,000 => 18,000,000
    // blended = 18,000,000 / 500 = 36,000 kobo/kg (₦360/kg)
    expect(s.blendedCostPerKgKobo).toBe(36_000);
    // margin = 300,000 − 36,000 = 264,000
    expect(s.marginPerKgKobo).toBe(264_000);
    expect(s.cashInFeedKobo).toBe(13_000_000);
  });

  it("still sums cash-in-feed for ponds without biomass, but excludes them from blended cost", () => {
    const s = portfolioSummary({
      ponds: [grownPond(), freshPond()],
      marketPriceKobo: 300_000,
    });
    expect(s.activePonds).toBe(2);
    expect(s.pondsWithBiomass).toBe(1);
    // fresh pond adds its feed cash but not its cost to the blended figure
    expect(s.cashInFeedKobo).toBe(13_000_000 + 1_300_000);
    expect(s.blendedCostPerKgKobo).toBe(36_000);
  });

  it("returns null cost/kg and margin when no pond has biomass", () => {
    const s = portfolioSummary({ ponds: [freshPond()], marketPriceKobo: 300_000 });
    expect(s.totalBiomassKg).toBe(0);
    expect(s.blendedCostPerKgKobo).toBeNull();
    expect(s.marginPerKgKobo).toBeNull();
  });

  it("returns null margin when biomass is known but market price is missing", () => {
    const s = portfolioSummary({ ponds: [grownPond()], marketPriceKobo: null });
    expect(s.blendedCostPerKgKobo).toBe(36_000);
    expect(s.marginPerKgKobo).toBeNull();
  });

  it("handles an empty portfolio without dividing by zero", () => {
    const s = portfolioSummary({ ponds: [], marketPriceKobo: 300_000 });
    expect(s.activePonds).toBe(0);
    expect(s.totalBiomassKg).toBe(0);
    expect(s.blendedCostPerKgKobo).toBeNull();
    expect(s.cashInFeedKobo).toBe(0);
  });
});
