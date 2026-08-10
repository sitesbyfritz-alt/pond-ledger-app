import { describe, it, expect } from "vitest";
import { computePondView, type PondViewInput, type ViewCycle } from "./pond-view";

const cycle: ViewCycle = {
  fingerlingCount: 1000,
  fingerlingUnitCostKobo: 5_000, // ₦50
  fingerlingWeightG: 5,
  stockingDate: "2026-01-01",
  targetWeightG: 1000,
};

const base: PondViewInput = {
  cycle,
  // 100 kg feed at ₦1300/kg = 13,000,000 kobo
  feedLogs: [{ date: "2026-02-01", feedKg: 100, feedCostKobo: 13_000_000 }],
  mortality: [{ date: "2026-01-15", count: 0 }],
  samples: [{ date: "2026-02-01", avgWeightG: 500 }],
  expenses: [],
  marketPriceKobo: 300_000, // ₦3000/kg
  feedPricePerKgKobo: 130_000, // ₦1300/kg
};

describe("computePondView", () => {
  it("computes cost/kg, biomass, survival, and margin", () => {
    const v = computePondView(base);
    expect(v.biomassKg.ok && v.biomassKg.value).toBeCloseTo(500);
    // cost = feed 13,000,000 + fingerlings 1000*5000 = 5,000,000 => 18,000,000 / 500 = 36,000
    expect(v.costPerKgKobo.ok && v.costPerKgKobo.value).toBe(36_000);
    expect(v.survivalPct.ok && v.survivalPct.value).toBe(100);
    expect(v.marginPerKgKobo).toBe(300_000 - 36_000);
  });

  it("builds a growth series and a cost trend", () => {
    const v = computePondView({
      ...base,
      feedLogs: [
        { date: "2026-01-20", feedKg: 40, feedCostKobo: 5_200_000 },
        { date: "2026-02-01", feedKg: 60, feedCostKobo: 7_800_000 },
      ],
      samples: [
        { date: "2026-01-20", avgWeightG: 200 },
        { date: "2026-02-01", avgWeightG: 500 },
      ],
    });
    expect(v.growth.map((g) => g.avgWeightG)).toEqual([200, 500]);
    expect(v.costTrend).toHaveLength(2);
    // cost/kg should fall as fish grow into their feed
    expect(v.costTrend[1].costPerKgNaira).toBeLessThan(v.costTrend[0].costPerKgNaira);
  });

  it("returns guarded results and no harvest advice before any sample", () => {
    const v = computePondView({ ...base, samples: [], marketPriceKobo: 300_000 });
    expect(v.costPerKgKobo.ok).toBe(false);
    expect(v.biomassKg.ok).toBe(false);
    expect(v.harvest).toBeNull(); // fcr needs growth
    expect(v.marginPerKgKobo).toBeNull();
  });

  it("omits margin when no market price is set", () => {
    const v = computePondView({ ...base, marketPriceKobo: null });
    expect(v.costPerKgKobo.ok).toBe(true);
    expect(v.marginPerKgKobo).toBeNull();
    expect(v.harvest).toBeNull();
  });
});
