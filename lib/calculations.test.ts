// lib/calculations.test.ts
// Run with: npx vitest
import { describe, it, expect } from "vitest";
import {
  survivingFish,
  survivalPct,
  latestAvgWeightG,
  currentBiomassKg,
  fcr,
  costPerKgKobo,
  marginPerKgKobo,
  harvestAdvice,
  projectedCycleProfitKobo,
  daysInCycle,
  totalCostKobo,
  type CycleInput,
} from "./calculations";

// Worked example: 1000 stocked, 100 dead -> 900 survivors @ 1.0kg = 900kg biomass.
// fingerlingWeightG = 0 keeps initial biomass 0 for clean numbers.
const cycle: CycleInput = {
  fingerlingCount: 1000,
  fingerlingUnitCostKobo: 5_000, // ₦50 per fingerling
  fingerlingWeightG: 0,
  stockingDate: "2026-01-01",
};
const mortality = [{ count: 60 }, { count: 40 }]; // 100 total
const samples = [
  { date: "2026-02-01", avgWeightG: 400 },
  { date: "2026-04-01", avgWeightG: 1000 }, // latest
];
const feedLogs = [{ feedKg: 1350, feedCostKobo: 175_500_000 }]; // ₦1,755,000
const expenses = [{ amountKobo: 89_500_000 }]; // brings total to ₦2,700,000

describe("population", () => {
  it("counts survivors", () => {
    expect(survivingFish(1000, mortality)).toBe(900);
  });
  it("never goes negative", () => {
    expect(survivingFish(50, [{ count: 80 }])).toBe(0);
  });
  it("computes survival %", () => {
    const r = survivalPct(1000, mortality);
    expect(r.ok && r.value).toBe(90);
  });
  it("guards zero stock", () => {
    expect(survivalPct(0, []).ok).toBe(false);
  });
});

describe("weight & biomass", () => {
  it("uses the latest sample by date", () => {
    expect(latestAvgWeightG(samples)).toBe(1000);
  });
  it("returns null when no samples", () => {
    expect(latestAvgWeightG([])).toBeNull();
  });
  it("computes current biomass in kg", () => {
    const r = currentBiomassKg(cycle, mortality, samples);
    expect(r.ok && r.value).toBe(900);
  });
  it("asks for a sample when none exist", () => {
    expect(currentBiomassKg(cycle, mortality, []).ok).toBe(false);
  });
});

describe("FCR", () => {
  it("equals feed / weight gained", () => {
    const r = fcr(cycle, feedLogs, mortality, samples);
    expect(r.ok && r.value).toBeCloseTo(1.5, 5); // 1350 / 900
  });
  it("refuses without growth", () => {
    // A fish that hasn't grown past its stocking weight has no weight gain, so FCR
    // is undefined. Use a non-zero stocking weight and a sample at that same weight.
    const noGrowthCycle: CycleInput = { ...cycle, fingerlingWeightG: 100 };
    const r = fcr(noGrowthCycle, feedLogs, mortality, [{ date: "2026-01-02", avgWeightG: 100 }]);
    expect(r.ok).toBe(false);
  });
});

describe("cost & margin", () => {
  it("sums total cost (feed + fingerlings + expenses)", () => {
    // 175,500,000 + (1000*5,000) + 89,500,000 = 270,000,000
    expect(totalCostKobo(cycle, feedLogs, expenses)).toBe(270_000_000);
  });
  it("break-even cost per kg = ₦3,000 (300,000 kobo)", () => {
    const r = costPerKgKobo(cycle, feedLogs, mortality, samples, expenses);
    expect(r.ok && r.value).toBe(300_000);
  });
  it("margin is negative at a ₦2,900 middleman price", () => {
    expect(marginPerKgKobo(290_000, 300_000)).toBe(-10_000); // -₦100/kg
  });
  it("margin is positive at a ₦3,600 direct price", () => {
    expect(marginPerKgKobo(360_000, 300_000)).toBe(60_000); // +₦600/kg
  });
});

describe("harvest advice", () => {
  it("keeps growing when the next kg still pays", () => {
    // FCR 1.5, feed ₦1,300/kg -> marginal cost ₦1,950; price ₦2,900 -> keep growing
    const a = harvestAdvice(1.5, 130_000, 290_000);
    expect(a.recommendHarvest).toBe(false);
    expect(a.marginalFeedCostKobo).toBe(195_000);
  });
  it("recommends harvest when feed outruns value", () => {
    // FCR 2.4, feed ₦1,300/kg -> ₦3,120 marginal cost; price ₦2,900 -> harvest
    const a = harvestAdvice(2.4, 130_000, 290_000);
    expect(a.recommendHarvest).toBe(true);
  });
});

describe("projection", () => {
  it("projects end-of-cycle profit at target weight", () => {
    const r = projectedCycleProfitKobo({
      cycle,
      feedLogs,
      mortalityLogs: mortality,
      samples,
      expenses,
      projectedTargetWeightG: 1000, // already at target -> no extra feed
      projectedFcr: 1.5,
      feedPricePerKgKobo: 130_000,
      sellPricePerKgKobo: 360_000, // ₦3,600
    });
    // biomass 900kg * ₦3,600 = ₦3,240,000 revenue; cost ₦2,700,000 -> profit ₦540,000
    expect(r.ok && r.value).toBe(54_000_000);
  });
});

describe("time", () => {
  it("counts whole days since stocking", () => {
    expect(daysInCycle("2026-01-01", new Date("2026-01-11T12:00:00"))).toBe(10);
  });
});
