import { describe, it, expect, vi, beforeEach } from "vitest";

const generateContent = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(() => ({ models: { generateContent } })),
}));

import { POST } from "./route";

const validBody = {
  ponds: [{ label: "Pond 1", day: 60, costPerKgNaira: 360, fcr: 1.5, survivalPct: 100, marginPerKgNaira: 2640, mortalityRatePct: 0, targetProgressPct: 50 }],
  marketPriceNaira: 3000,
};
const req = (body: unknown) =>
  new Request("http://x/api/insights", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  generateContent.mockReset();
  delete process.env.GOOGLE_API_KEY;
});

describe("POST /api/insights", () => {
  it("503 when no key", async () => {
    const res = await POST(req(validBody));
    expect(res.status).toBe(503);
  });

  it("400 on a bad body", async () => {
    process.env.GOOGLE_API_KEY = "k";
    const res = await POST(req({ ponds: [{ label: "x", day: 1, feedKg: 9 }], marketPriceNaira: null }));
    expect(res.status).toBe(400);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("200 with the model summary on success", async () => {
    process.env.GOOGLE_API_KEY = "k";
    generateContent.mockResolvedValue({ text: "  Pond 1 is profitable. Hold the harvest a week.  " });
    const res = await POST(req(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ summary: "Pond 1 is profitable. Hold the harvest a week." });
  });

  it("422 when the model returns no text", async () => {
    process.env.GOOGLE_API_KEY = "k";
    generateContent.mockResolvedValue({ text: "" });
    const res = await POST(req(validBody));
    expect(res.status).toBe(422);
  });

  it("502 when the SDK throws", async () => {
    process.env.GOOGLE_API_KEY = "k";
    generateContent.mockRejectedValue(new Error("quota"));
    const res = await POST(req(validBody));
    expect(res.status).toBe(502);
  });
});
