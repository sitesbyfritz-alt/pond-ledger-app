// Backup export/import round-trip — CLAUDE.md requires this to be covered.
// fake-indexeddb/auto must be imported before ./db (which opens a Dexie DB at import).
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { repo, newRecord } from "./repository";
import { db } from "./db";
import { nairaToKobo } from "./format";

async function wipe() {
  await Promise.all(db.tables.map((t) => t.clear()));
}

beforeEach(wipe);

async function seedMinimal() {
  const profile = newRecord({ name: "Test Farmer" });
  await repo.upsertProfile(profile);
  const farm = newRecord({ name: "Test Farm", currency: "NGN", defaultFeedPriceKobo: nairaToKobo(1300) });
  await repo.upsertFarm(farm);
  const pond = newRecord({ farmId: farm.id, name: "Pond 1", type: "concrete" as const, status: "active" as const });
  await repo.upsertPond(pond);
  const cycle = newRecord({
    pondId: pond.id,
    species: "catfish" as const,
    stockingDate: "2026-01-01",
    fingerlingCount: 500,
    fingerlingUnitCostKobo: nairaToKobo(50),
    fingerlingWeightG: 5,
    targetWeightG: 1000,
    status: "active" as const,
  });
  await repo.upsertCycle(cycle);
  await repo.addFeedLog(
    newRecord({ cycleId: cycle.id, date: "2026-01-08", feedItemId: null, feedKg: 10, feedCostKobo: nairaToKobo(13000) })
  );
  await repo.addExpense(
    newRecord({ cycleId: cycle.id, farmId: farm.id, date: "2026-01-08", category: "labor" as const, amountKobo: nairaToKobo(5000) })
  );
  await repo.addMarketPrice(
    newRecord({ farmId: farm.id, date: "2026-01-08", pricePerKgKobo: nairaToKobo(3000), source: "market" })
  );
  return { farm, pond, cycle };
}

describe("backup round-trip", () => {
  it("exports, wipes, and restores an identical dataset (replace)", async () => {
    await seedMinimal();
    const before = JSON.parse(await repo.exportBackup());

    await wipe();
    // sanity: really empty
    expect((await db.ponds.toArray()).length).toBe(0);

    await repo.importBackup(JSON.stringify(before), "replace");
    const after = JSON.parse(await repo.exportBackup());

    expect(after.data).toEqual(before.data);
    expect(after.backupVersion).toBe(before.backupVersion);
  });

  it("merge import keeps existing records and adds imported ones", async () => {
    const { farm } = await seedMinimal();
    const backup = await repo.exportBackup();

    // add a second, independent pond that is NOT in the backup
    const extraPond = newRecord({ farmId: farm.id, name: "Pond 2", type: "tank" as const, status: "active" as const });
    await repo.upsertPond(extraPond);

    await repo.importBackup(backup, "merge");

    const ponds = await repo.listPonds(farm.id);
    const names = ponds.map((p) => p.name).sort();
    expect(names).toEqual(["Pond 1", "Pond 2"]);
  });

  it("rejects a malformed backup document", async () => {
    await expect(repo.importBackup('{"nope":true}', "replace")).rejects.toBeDefined();
  });
});
