// lib/format.ts — display-edge formatting. Money is kobo internally; convert here only.

export function formatNaira(kobo: number, opts?: { compact?: boolean }): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    notation: opts?.compact ? "compact" : "standard",
    maximumFractionDigits: opts?.compact ? 1 : 2,
  }).format(kobo / 100);
}

/** Naira per kg from a kobo/kg value. */
export function formatNairaPerKg(kobo: number): string {
  return `${formatNaira(kobo)}/kg`;
}

export function formatKg(kg: number): string {
  return `${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 1 }).format(kg)} kg`;
}

export function formatPct(value: number): string {
  return `${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 1 }).format(value)}%`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-NG").format(n);
}

/** Parse a naira string/number into integer kobo for storage. */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}
