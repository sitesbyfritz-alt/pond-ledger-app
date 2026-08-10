import { describe, it, expect } from "vitest";
import { csvField, rowsToCsv, portfolioCsv } from "./report";
import type { PondMetric } from "./analytics";

describe("csv", () => {
  it("escapes commas, quotes, and newlines", () => {
    expect(csvField("plain")).toBe("plain");
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField('he said "hi"')).toBe('"he said ""hi"""');
    expect(csvField("line\nbreak")).toBe('"line\nbreak"');
  });

  it("builds a header + rows", () => {
    const csv = rowsToCsv(["A", "B"], [[1, 2], ["x", "y"]]);
    expect(csv).toBe("A,B\n1,2\nx,y");
  });
});

describe("portfolioCsv", () => {
  it("renders naira and blanks nulls", () => {
    const metrics: PondMetric[] = [
      {
        id: "p1", name: "Pond 1", day: 60,
        costPerKgKobo: 36_000, fcr: 1.5, survivalPct: 90, biomassKg: 500,
        marginPerKgKobo: 264_000, mortalityCount: 100, mortalityRatePct: 10, targetProgressPct: 50,
      },
      {
        id: "p2", name: "Pond 2", day: 10,
        costPerKgKobo: null, fcr: null, survivalPct: null, biomassKg: null,
        marginPerKgKobo: null, mortalityCount: 0, mortalityRatePct: 0, targetProgressPct: null,
      },
    ];
    const csv = portfolioCsv(metrics);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("Cost/kg (NGN)");
    expect(lines[1]).toContain("Pond 1");
    expect(lines[1]).toContain("360"); // 36,000 kobo -> ₦360
    // nulls become empty fields for Pond 2
    expect(lines[2]).toBe("Pond 2,10,,,,,,0,0");
  });
});
