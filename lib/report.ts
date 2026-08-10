// lib/report.ts — PURE report builders. No I/O. Turns analytics metrics into a
// CSV string for export. Money shown in naira (not kobo) at the export edge.
import type { PondMetric } from "./analytics";

/** RFC-4180-ish CSV field escaping. */
export function csvField(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map(csvField).join(",")];
  for (const row of rows) lines.push(row.map(csvField).join(","));
  return lines.join("\n");
}

const naira = (kobo: number | null): string | number => (kobo === null ? "" : Math.round(kobo / 100));
const one = (n: number | null): string | number => (n === null ? "" : Number(n.toFixed(1)));

/** Portfolio benchmark as a CSV report. */
export function portfolioCsv(metrics: PondMetric[]): string {
  const headers = [
    "Pond",
    "Day",
    "Cost/kg (NGN)",
    "FCR",
    "Survival %",
    "Biomass (kg)",
    "Margin/kg (NGN)",
    "Deaths",
    "Mortality %",
  ];
  const rows = metrics.map((m) => [
    m.name,
    m.day,
    naira(m.costPerKgKobo),
    m.fcr === null ? "" : Number(m.fcr.toFixed(2)),
    one(m.survivalPct),
    one(m.biomassKg),
    naira(m.marginPerKgKobo),
    m.mortalityCount,
    one(m.mortalityRatePct),
  ]);
  return rowsToCsv(headers, rows);
}
