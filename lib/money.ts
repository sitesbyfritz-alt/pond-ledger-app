// lib/money.ts — PURE money aggregation. No I/O, no React. Kobo throughout.

export interface SaleLine {
  kg: number;
  pricePerKgKobo: number;
}

export interface SalesSummary {
  totalKg: number;
  revenueKobo: number;
  /** weighted average price per kg, or null if nothing sold */
  avgPricePerKgKobo: number | null;
}

export function salesSummary(sales: SaleLine[]): SalesSummary {
  let totalKg = 0;
  let revenueKobo = 0;
  for (const s of sales) {
    totalKg += s.kg;
    revenueKobo += Math.round(s.kg * s.pricePerKgKobo);
  }
  return {
    totalKg,
    revenueKobo,
    avgPricePerKgKobo: totalKg > 0 ? Math.round(revenueKobo / totalKg) : null,
  };
}

/**
 * Realized net so far: revenue booked minus total cost incurred. Negative early
 * in a cycle is normal (costs precede the harvest sale) — this is cash position,
 * not final profit.
 */
export function realizedNetKobo(revenueKobo: number, totalCostKobo: number): number {
  return revenueKobo - totalCostKobo;
}
