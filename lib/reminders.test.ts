import { describe, it, expect } from "vitest";
import { dueReminders, type PondFeedState } from "./reminders";

const today = "2026-08-10";

describe("dueReminders", () => {
  it("nudges to feed when today's feed isn't logged", () => {
    const ponds: PondFeedState[] = [
      { id: "a", name: "A", lastFeedDate: "2026-08-09", lastSampleDate: today },
    ];
    const r = dueReminders(ponds, today);
    expect(r.some((x) => x.id === "a-feed" && x.kind === "feed")).toBe(true);
  });

  it("stays silent on feed once logged today", () => {
    const ponds: PondFeedState[] = [
      { id: "a", name: "A", lastFeedDate: today, lastSampleDate: today },
    ];
    const r = dueReminders(ponds, today);
    expect(r.some((x) => x.kind === "feed")).toBe(false);
  });

  it("asks for a weight sample when the last one is stale (>=7 days)", () => {
    const ponds: PondFeedState[] = [
      { id: "a", name: "A", lastFeedDate: today, lastSampleDate: "2026-08-01" }, // 9 days
    ];
    const r = dueReminders(ponds, today);
    expect(r.some((x) => x.kind === "sample")).toBe(true);
  });

  it("asks for a sample when none exists", () => {
    const ponds: PondFeedState[] = [
      { id: "a", name: "A", lastFeedDate: today, lastSampleDate: null },
    ];
    expect(dueReminders(ponds, today).some((x) => x.kind === "sample")).toBe(true);
  });
});
