import { describe, it, expect } from "vitest";
import { salesSummary, realizedNetKobo } from "./money";

describe("salesSummary", () => {
  it("totals kg and revenue and weights the average price", () => {
    const s = salesSummary([
      { kg: 100, pricePerKgKobo: 300_000 }, // ₦3000/kg
      { kg: 50, pricePerKgKobo: 320_000 }, // ₦3200/kg
    ]);
    expect(s.totalKg).toBe(150);
    expect(s.revenueKobo).toBe(100 * 300_000 + 50 * 320_000);
    // weighted avg = 46,000,000 / 150 = 306,666.67 -> rounded
    expect(s.avgPricePerKgKobo).toBe(Math.round((100 * 300_000 + 50 * 320_000) / 150));
  });

  it("returns null average with no sales and never divides by zero", () => {
    const s = salesSummary([]);
    expect(s.totalKg).toBe(0);
    expect(s.revenueKobo).toBe(0);
    expect(s.avgPricePerKgKobo).toBeNull();
  });
});

describe("realizedNetKobo", () => {
  it("is revenue minus cost (can be negative mid-cycle)", () => {
    expect(realizedNetKobo(0, 5_000_000)).toBe(-5_000_000);
    expect(realizedNetKobo(20_000_000, 5_000_000)).toBe(15_000_000);
  });
});
