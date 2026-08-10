// lib/repository.ts
// The ONLY way the app touches data. UI/hooks depend on this interface, never on Dexie.
// Swap DexieRepository for a future SyncRepository (e.g. Supabase) with zero UI changes.
import { db } from "./db";
import { BackupDoc, BACKUP_VERSION } from "./types";
import type {
  Profile,
  Farm,
  Pond,
  Cycle,
  FeedItem,
  FeedLog,
  MortalityLog,
  WeightSample,
  Expense,
  MarketPrice,
  Sale,
} from "./types";

/** Helper to stamp base fields on create. */
export function newRecord<T extends object>(data: T) {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), createdAt: now, updatedAt: now, deletedAt: null, ...data };
}

export interface Repository {
  // Identity / farm setup (used by onboarding)
  getProfile(): Promise<Profile | undefined>;
  upsertProfile(profile: Profile): Promise<void>;
  listFarms(): Promise<Farm[]>;
  getFarm(id: string): Promise<Farm | undefined>;
  upsertFarm(farm: Farm): Promise<void>;

  // Ponds
  listPonds(farmId: string): Promise<Pond[]>;
  getPond(id: string): Promise<Pond | undefined>;
  upsertPond(pond: Pond): Promise<void>;
  softDeletePond(id: string): Promise<void>;

  // Cycles
  listCycles(pondId: string): Promise<Cycle[]>;
  getActiveCycle(pondId: string): Promise<Cycle | undefined>;
  upsertCycle(cycle: Cycle): Promise<void>;

  // Logs
  listFeedLogs(cycleId: string): Promise<FeedLog[]>;
  addFeedLog(log: FeedLog): Promise<void>;
  listMortality(cycleId: string): Promise<MortalityLog[]>;
  addMortality(log: MortalityLog): Promise<void>;
  listWeightSamples(cycleId: string): Promise<WeightSample[]>;
  addWeightSample(s: WeightSample): Promise<void>;

  // Money
  listExpenses(cycleId: string): Promise<Expense[]>;
  addExpense(e: Expense): Promise<void>;
  listSales(cycleId: string): Promise<Sale[]>;
  addSale(s: Sale): Promise<void>;
  listFeedItems(farmId: string): Promise<FeedItem[]>;
  upsertFeedItem(f: FeedItem): Promise<void>;
  latestMarketPrice(farmId: string): Promise<MarketPrice | undefined>;
  addMarketPrice(m: MarketPrice): Promise<void>;

  // Backup
  exportBackup(): Promise<string>;
  importBackup(json: string, mode: "replace" | "merge"): Promise<void>;
}

/** live rows only (deletedAt === null) */
const live = <T extends { deletedAt: string | null }>(rows: T[]) =>
  rows.filter((r) => r.deletedAt === null);

export class DexieRepository implements Repository {
  async getProfile() {
    return (await db.profile.toArray())[0];
  }
  async upsertProfile(profile: Profile) {
    await db.profile.put({ ...profile, updatedAt: new Date().toISOString() });
  }
  async listFarms() {
    return live(await db.farms.toArray());
  }
  async getFarm(id: string) {
    return db.farms.get(id);
  }
  async upsertFarm(farm: Farm) {
    await db.farms.put({ ...farm, updatedAt: new Date().toISOString() });
  }

  async listPonds(farmId: string) {
    return live(await db.ponds.where("farmId").equals(farmId).toArray());
  }
  async getPond(id: string) {
    return db.ponds.get(id);
  }
  async upsertPond(pond: Pond) {
    await db.ponds.put({ ...pond, updatedAt: new Date().toISOString() });
  }
  async softDeletePond(id: string) {
    await db.ponds.update(id, { deletedAt: new Date().toISOString() });
  }

  async listCycles(pondId: string) {
    return live(await db.cycles.where("pondId").equals(pondId).toArray());
  }
  async getActiveCycle(pondId: string) {
    return (await this.listCycles(pondId)).find((c) => c.status === "active");
  }
  async upsertCycle(cycle: Cycle) {
    await db.cycles.put({ ...cycle, updatedAt: new Date().toISOString() });
  }

  async listFeedLogs(cycleId: string) {
    return live(await db.feedLogs.where("cycleId").equals(cycleId).toArray());
  }
  async addFeedLog(log: FeedLog) {
    await db.feedLogs.put(log);
  }
  async listMortality(cycleId: string) {
    return live(await db.mortalityLogs.where("cycleId").equals(cycleId).toArray());
  }
  async addMortality(log: MortalityLog) {
    await db.mortalityLogs.put(log);
  }
  async listWeightSamples(cycleId: string) {
    return live(await db.weightSamples.where("cycleId").equals(cycleId).toArray());
  }
  async addWeightSample(s: WeightSample) {
    await db.weightSamples.put(s);
  }

  async listExpenses(cycleId: string) {
    return live(await db.expenses.where("cycleId").equals(cycleId).toArray());
  }
  async addExpense(e: Expense) {
    await db.expenses.put(e);
  }
  async listSales(cycleId: string) {
    return live(await db.sales.where("cycleId").equals(cycleId).toArray());
  }
  async addSale(s: Sale) {
    await db.sales.put(s);
  }
  async listFeedItems(farmId: string) {
    return live(await db.feedItems.where("farmId").equals(farmId).toArray());
  }
  async upsertFeedItem(f: FeedItem) {
    await db.feedItems.put({ ...f, updatedAt: new Date().toISOString() });
  }
  async latestMarketPrice(farmId: string) {
    const rows = live(await db.marketPrices.where("farmId").equals(farmId).toArray());
    return rows.sort((a, b) => b.date.localeCompare(a.date))[0];
  }
  async addMarketPrice(m: MarketPrice) {
    await db.marketPrices.put(m);
  }

  async exportBackup() {
    const data = {
      profile: await db.profile.toArray(),
      farms: await db.farms.toArray(),
      farmMembers: await db.farmMembers.toArray(),
      ponds: await db.ponds.toArray(),
      cycles: await db.cycles.toArray(),
      feedItems: await db.feedItems.toArray(),
      feedLogs: await db.feedLogs.toArray(),
      mortalityLogs: await db.mortalityLogs.toArray(),
      weightSamples: await db.weightSamples.toArray(),
      expenses: await db.expenses.toArray(),
      marketPrices: await db.marketPrices.toArray(),
      sales: await db.sales.toArray(),
      reminders: await db.reminders.toArray(),
    };
    const doc = BackupDoc.parse({
      backupVersion: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data,
    });
    return JSON.stringify(doc);
  }

  async importBackup(json: string, mode: "replace" | "merge") {
    const doc = BackupDoc.parse(JSON.parse(json));
    // TODO: if doc.backupVersion < BACKUP_VERSION, run forward migrations here.
    const d = doc.data;
    await db.transaction("rw", db.tables, async () => {
      if (mode === "replace") {
        await Promise.all(db.tables.map((t) => t.clear()));
      }
      await db.profile.bulkPut(d.profile);
      await db.farms.bulkPut(d.farms);
      await db.farmMembers.bulkPut(d.farmMembers);
      await db.ponds.bulkPut(d.ponds);
      await db.cycles.bulkPut(d.cycles);
      await db.feedItems.bulkPut(d.feedItems);
      await db.feedLogs.bulkPut(d.feedLogs);
      await db.mortalityLogs.bulkPut(d.mortalityLogs);
      await db.weightSamples.bulkPut(d.weightSamples);
      await db.expenses.bulkPut(d.expenses);
      await db.marketPrices.bulkPut(d.marketPrices);
      await db.sales.bulkPut(d.sales);
      await db.reminders.bulkPut(d.reminders);
    });
  }
}

export const repo: Repository = new DexieRepository();
