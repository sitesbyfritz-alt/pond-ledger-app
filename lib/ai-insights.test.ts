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
