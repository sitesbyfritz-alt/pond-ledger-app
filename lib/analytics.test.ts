import { describe, it, expect } from "vitest";
import { pondMetric, insights, type AnalyticsPond } from "./analytics";

const base = (over: Partial<AnalyticsPond> = {}): AnalyticsPond => ({
  id: "p1",
  name: "Pond 1",
  cycle: {
    fingerlingCount: 1000,
    fingerlingUnitCostKobo: 5000,
    fingerlingWeightG: 5,
    stockingDate: "2026-01-01",
    targetWeightG: 1000,
  },
  feedLogs: [{ feedKg: 100, feedCostKobo: 13_000_000 }],
  mortality: [{ count: 0 }],
  samples: [{ date: "2026-03-01", avgWeightG: 500 }],
  expenses: [],
  ...over,
});

describe("pondMetric", () => {
  it("computes guarded metrics", () => {
    const m = pondMetric(base(), 300_000);
    // biomass 1000*500g = 500kg; cost = 13,000,000 + 5,000,000 = 18,000,000 -> 36,000/kg
    expect(m.biomassKg).toBeCloseTo(500);
    expect(m.costPerKgKobo).toBe(36_000);
    expect(m.marginPerKgKobo).toBe(300_000 - 36_000);
    expect(m.survivalPct).toBe(100);
    expect(m.targetProgressPct).toBeCloseTo(50);
  });

  it("returns nulls (never NaN) without a weight sample", () => {
    const m = pondMetric(base({ samples: [] }), 300_000);
    expect(m.costPerKgKobo).toBeNull();
    expect(m.biomassKg).toBeNull();
    expect(m.marginPerKgKobo).toBeNull();
    expect(m.targetProgressPct).toBeNull();
  });
});

describe("insights", () => {
  it("flags a pond that is under water", () => {
    // market below cost -> negative margin
    const m = pondMetric(base(), 20_000);
    const list = insights([m], 20_000);
    expect(list.some((i) => i.id === "p1-loss" && i.level === "warn")).toBe(true);
  });

  it("flags high mortality", () => {
    const m = pondMetric(base({ mortality: [{ count: 200 }] }), 300_000); // 20%
    const list = insights([m], 300_000);
    expect(list.some((i) => i.id === "p1-mort")).toBe(true);
  });

  it("names the cheapest producer when several ponds are valued", () => {
    const cheap = pondMetric(base({ id: "a", name: "A" }), 300_000);
    const dear = pondMetric(
      base({ id: "b", name: "B", feedLogs: [{ feedKg: 300, feedCostKobo: 39_000_000 }] }),
      300_000
    );
    const list = insights([cheap, dear], 300_000);
    expect(list.some((i) => i.title.includes("A") && i.level === "good")).toBe(true);
  });

  it("gives an all-clear when nothing is wrong", () => {
    const m = pondMetric(base(), 300_000);
    const list = insights([m], 300_000);
    expect(list.some((i) => i.id === "all-clear")).toBe(true);
  });
});
