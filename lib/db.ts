// lib/db.ts
// Dexie (IndexedDB) schema. Local-first persistence.
// NOTE: components must NOT import this directly — go through lib/repository.ts.
import Dexie, { type Table } from "dexie";
import type {
  Profile,
  Farm,
  FarmMember,
  Pond,
  Cycle,
  FeedItem,
  FeedLog,
  MortalityLog,
  WeightSample,
  Expense,
  MarketPrice,
  Sale,
  Reminder,
} from "./types";

export const SCHEMA_VERSION = 1;

/** Photo blobs kept in their own table to avoid bloating log rows. */
export interface PhotoBlob {
  id: string;
  feedLogId: string;
  blob: Blob;
  createdAt: string;
}

export class PondLedgerDB extends Dexie {
  profile!: Table<Profile, string>;
  farms!: Table<Farm, string>;
  farmMembers!: Table<FarmMember, string>;
  ponds!: Table<Pond, string>;
  cycles!: Table<Cycle, string>;
  feedItems!: Table<FeedItem, string>;
  feedLogs!: Table<FeedLog, string>;
  mortalityLogs!: Table<MortalityLog, string>;
  weightSamples!: Table<WeightSample, string>;
  expenses!: Table<Expense, string>;
  marketPrices!: Table<MarketPrice, string>;
  sales!: Table<Sale, string>;
  reminders!: Table<Reminder, string>;
  photos!: Table<PhotoBlob, string>;

  constructor() {
    super("pondledger");
    // Index primary keys + the foreign keys / date fields we query on.
    // Compound indexes speed up "logs for this cycle, by date".
    this.version(SCHEMA_VERSION).stores({
      profile: "id",
      farms: "id",
      farmMembers: "id, farmId",
      ponds: "id, farmId, status",
      cycles: "id, pondId, status",
      feedItems: "id, farmId",
      feedLogs: "id, cycleId, [cycleId+date]",
      mortalityLogs: "id, cycleId, [cycleId+date]",
      weightSamples: "id, cycleId, [cycleId+date]",
      expenses: "id, farmId, cycleId, [cycleId+date]",
      marketPrices: "id, farmId, [farmId+date]",
      sales: "id, cycleId, [cycleId+date]",
      reminders: "id, farmId, done, dueAt",
      photos: "id, feedLogId",
    });
    // Future migrations: this.version(2).stores({...}).upgrade(tx => {...})
  }
}

export const db = new PondLedgerDB();

/**
 * Ask the browser to make storage persistent so IndexedDB isn't evicted
 * under storage pressure. Call once on app start. Safe to ignore failures.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.storage?.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}
