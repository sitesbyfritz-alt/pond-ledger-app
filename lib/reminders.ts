// lib/reminders.ts — PURE derivation of "what still needs doing today". No I/O.
// Local-first: reminders are computed from the data, not scheduled push jobs.

export interface PondFeedState {
  id: string;
  name: string;
  /** most recent feed-log date (YYYY-MM-DD) for the active cycle, or null */
  lastFeedDate: string | null;
  /** most recent weight-sample date, or null */
  lastSampleDate: string | null;
}

export interface Reminder {
  id: string;
  pondId: string;
  kind: "feed" | "sample";
  message: string;
}

const daysBetween = (fromISO: string, toISO: string): number => {
  const a = new Date(fromISO + "T00:00:00").getTime();
  const b = new Date(toISO + "T00:00:00").getTime();
  return Math.round((b - a) / 86_400_000);
};

/**
 * Feed reminder when today's feed isn't logged yet; weight-sample reminder when
 * the last sample is over `sampleGapDays` old (default 7). Ponds are silent once
 * logged for the day.
 */
export function dueReminders(
  ponds: PondFeedState[],
  todayISO: string,
  sampleGapDays = 7
): Reminder[] {
  const out: Reminder[] = [];
  for (const p of ponds) {
    if (p.lastFeedDate !== todayISO) {
      out.push({
        id: `${p.id}-feed`,
        pondId: p.id,
        kind: "feed",
        message:
          p.lastFeedDate === null
            ? `${p.name}: no feed logged yet`
            : `${p.name}: feed not logged today`,
      });
    }
    if (p.lastSampleDate === null || daysBetween(p.lastSampleDate, todayISO) >= sampleGapDays) {
      out.push({
        id: `${p.id}-sample`,
        pondId: p.id,
        kind: "sample",
        message: `${p.name}: weigh a few fish to keep cost/kg accurate`,
      });
    }
  }
  return out;
}
