// lib/types.ts
// Zod schemas are the single source of truth. Derive TS types with z.infer.
// Conventions: money in integer kobo, weights in integer grams, dates as ISO strings.
import { z } from "zod";

/** Fields every record carries. Enables soft-delete + future sync. */
export const BaseRecord = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().default(null),
});

export const PondType = z.enum(["earthen", "concrete", "tarpaulin", "tank"]);
export const PondStatus = z.enum(["empty", "active", "ready", "closed"]);
export const CycleStatus = z.enum(["active", "harvested", "closed"]);
export const SalesChannel = z.enum(["middleman", "direct", "restaurant", "retail"]);
export const ExpenseCategory = z.enum([
  "feed",
  "fingerlings",
  "labor",
  "power",
  "medication",
  "water",
  "equipment",
  "misc",
]);
export const MemberRole = z.enum(["owner", "worker"]);

export const Profile = BaseRecord.extend({
  name: z.string().min(1),
});

export const Farm = BaseRecord.extend({
  name: z.string().min(1),
  currency: z.string().default("NGN"),
  defaultFeedPriceKobo: z.number().int().nonnegative(),
});

export const FarmMember = BaseRecord.extend({
  farmId: z.string().uuid(),
  name: z.string().min(1),
  role: MemberRole.default("owner"),
});

export const Pond = BaseRecord.extend({
  farmId: z.string().uuid(),
  name: z.string().min(1),
  type: PondType,
  capacity: z.number().int().positive().optional(),
  status: PondStatus.default("empty"),
});

export const Cycle = BaseRecord.extend({
  pondId: z.string().uuid(),
  species: z.literal("catfish").default("catfish"),
  stockingDate: z.string(), // YYYY-MM-DD
  fingerlingCount: z.number().int().positive(),
  fingerlingUnitCostKobo: z.number().int().nonnegative(),
  fingerlingWeightG: z.number().nonnegative().default(5), // ~5g typical
  targetWeightG: z.number().positive().default(1000),
  targetHarvestDate: z.string().optional(),
  status: CycleStatus.default("active"),
});

export const FeedItem = BaseRecord.extend({
  farmId: z.string().uuid(),
  brand: z.string().min(1),
  pelletSizeMm: z.number().positive().optional(),
  unit: z.string().default("kg"),
  pricePerKgKobo: z.number().int().nonnegative(),
  stockKg: z.number().nonnegative().default(0),
});

export const FeedLog = BaseRecord.extend({
  cycleId: z.string().uuid(),
  date: z.string(), // YYYY-MM-DD
  feedItemId: z.string().uuid().nullable().default(null),
  feedKg: z.number().positive(),
  feedCostKobo: z.number().int().nonnegative(),
  note: z.string().optional(),
  // photoBlob stored separately in Dexie as Blob; keep a flag/id here if referenced
});

export const MortalityLog = BaseRecord.extend({
  cycleId: z.string().uuid(),
  date: z.string(),
  count: z.number().int().nonnegative(),
  cause: z.string().optional(),
});

export const WeightSample = BaseRecord.extend({
  cycleId: z.string().uuid(),
  date: z.string(),
  avgWeightG: z.number().positive(),
  sampleSize: z.number().int().positive().default(10),
});

export const Expense = BaseRecord.extend({
  cycleId: z.string().uuid().nullable().default(null),
  farmId: z.string().uuid(),
  date: z.string(),
  category: ExpenseCategory,
  amountKobo: z.number().int().nonnegative(),
  note: z.string().optional(),
});

export const MarketPrice = BaseRecord.extend({
  farmId: z.string().uuid(),
  date: z.string(),
  pricePerKgKobo: z.number().int().nonnegative(),
  source: z.string().optional(),
});

export const Sale = BaseRecord.extend({
  cycleId: z.string().uuid(),
  date: z.string(),
  channel: SalesChannel,
  kg: z.number().positive(),
  pricePerKgKobo: z.number().int().nonnegative(),
  buyerName: z.string().optional(),
  buyerContact: z.string().optional(),
});

export const Reminder = BaseRecord.extend({
  farmId: z.string().uuid(),
  type: z.string(),
  dueAt: z.string().datetime(),
  done: z.boolean().default(false),
});

// Inferred types
export type Profile = z.infer<typeof Profile>;
export type Farm = z.infer<typeof Farm>;
export type FarmMember = z.infer<typeof FarmMember>;
export type Pond = z.infer<typeof Pond>;
export type Cycle = z.infer<typeof Cycle>;
export type FeedItem = z.infer<typeof FeedItem>;
export type FeedLog = z.infer<typeof FeedLog>;
export type MortalityLog = z.infer<typeof MortalityLog>;
export type WeightSample = z.infer<typeof WeightSample>;
export type Expense = z.infer<typeof Expense>;
export type MarketPrice = z.infer<typeof MarketPrice>;
export type Sale = z.infer<typeof Sale>;
export type Reminder = z.infer<typeof Reminder>;

/** Versioned full-database backup document (Export/Import). */
export const BACKUP_VERSION = 1;
export const BackupDoc = z.object({
  backupVersion: z.number().int(),
  exportedAt: z.string().datetime(),
  data: z.object({
    profile: z.array(Profile),
    farms: z.array(Farm),
    farmMembers: z.array(FarmMember),
    ponds: z.array(Pond),
    cycles: z.array(Cycle),
    feedItems: z.array(FeedItem),
    feedLogs: z.array(FeedLog),
    mortalityLogs: z.array(MortalityLog),
    weightSamples: z.array(WeightSample),
    expenses: z.array(Expense),
    marketPrices: z.array(MarketPrice),
    sales: z.array(Sale),
    reminders: z.array(Reminder),
  }),
});
export type BackupDoc = z.infer<typeof BackupDoc>;

/** Thrown when a backup can't be safely imported: unrecognisable shape, or made
 *  by a newer app version than this one. Distinct from a Zod validation error so
 *  the UI can show a version-specific message. */
export class BackupVersionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupVersionError";
  }
}

/** Forward migrations, keyed by the version they upgrade FROM (n → n+1). Empty
 *  today (BACKUP_VERSION is 1). When the DB/backup shape changes: bump
 *  BACKUP_VERSION and add MIGRATIONS[oldVersion] that reshapes the raw doc up one
 *  step. Migrations run on the raw JSON, before strict Zod validation. */
type RawBackup = { backupVersion: number; exportedAt?: string; data: unknown };
const MIGRATIONS: Record<number, (doc: RawBackup) => RawBackup> = {};

/** Bring a raw parsed backup up to the current BACKUP_VERSION before strict
 *  validation. Rejects newer-than-supported backups and unrecognised shapes
 *  rather than silently dropping data — backup is sacred (see CLAUDE.md). */
export function migrateBackup(raw: unknown): RawBackup {
  if (
    typeof raw !== "object" ||
    raw === null ||
    typeof (raw as { backupVersion?: unknown }).backupVersion !== "number"
  ) {
    throw new BackupVersionError("Not a recognisable PondLedger backup (missing backupVersion).");
  }
  let doc = raw as RawBackup;
  if (doc.backupVersion > BACKUP_VERSION) {
    throw new BackupVersionError(
      `This backup was made by a newer version of PondLedger (backup v${doc.backupVersion}, this app supports v${BACKUP_VERSION}). Update the app, then import.`
    );
  }
  while (doc.backupVersion < BACKUP_VERSION) {
    const step = MIGRATIONS[doc.backupVersion];
    if (!step) throw new BackupVersionError(`Cannot migrate this backup from v${doc.backupVersion}.`);
    doc = step(doc);
  }
  return doc;
}
