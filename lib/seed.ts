// lib/seed.ts — DEV-ONLY demo data so the dashboard has something to show.
// This is the one sanctioned place (besides backup import) that writes many tables at once.
// It goes through the repository where possible; farm/profile use db directly for setup.
import { db } from "./db";
import { repo, newRecord } from "./repository";
import { nairaToKobo } from "./format";

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

/** Idempotent-ish: clears then seeds a single demo farm with two ponds. */
export async function seedDemoData() {
  await Promise.all(db.tables.map((t) => t.clear()));

  const profile = newRecord({ name: "Demo Farmer" });
  await db.profile.put(profile);

  const farm = newRecord({
    name: "Riverside Catfish",
    currency: "NGN",
    defaultFeedPriceKobo: nairaToKobo(1300),
  });
  await db.farms.put(farm);

  const feedItem = newRecord({
    farmId: farm.id,
    brand: "Coppens 4mm",
    pelletSizeMm: 4,
    unit: "kg",
    pricePerKgKobo: nairaToKobo(1300),
    stockKg: 120,
  });
  await repo.upsertFeedItem(feedItem);

  // Pond A — mid-cycle, healthy
  const pondA = newRecord({ farmId: farm.id, name: "Pond A", type: "concrete" as const, status: "active" as const });
  await repo.upsertPond(pondA);
  const cycleA = newRecord({
    pondId: pondA.id,
    species: "catfish" as const,
    stockingDate: daysAgo(90),
    fingerlingCount: 1000,
    fingerlingUnitCostKobo: nairaToKobo(50),
    fingerlingWeightG: 5,
    targetWeightG: 1000,
    targetHarvestDate: daysAgo(-30),
    status: "active" as const,
  });
  await repo.upsertCycle(cycleA);

  // ~13 weeks of feeding, weekly weight samples, a little mortality
  for (let w = 0; w < 13; w++) {
    const kg = 6 + w * 0.8;
    await repo.addFeedLog(
      newRecord({
        cycleId: cycleA.id,
        date: daysAgo(90 - w * 7),
        feedItemId: feedItem.id,
        feedKg: Number(kg.toFixed(1)),
        feedCostKobo: nairaToKobo(kg * 1300),
        note: "",
      })
    );
    await repo.addWeightSample(
      newRecord({
        cycleId: cycleA.id,
        date: daysAgo(90 - w * 7),
        avgWeightG: 5 + w * 78, // ~1kg by week 13
        sampleSize: 10,
      })
    );
    if (w % 4 === 0) {
      await repo.addMortality(
        newRecord({ cycleId: cycleA.id, date: daysAgo(90 - w * 7), count: 25, cause: "handling" })
      );
    }
  }

  // Pond B — early cycle
  const pondB = newRecord({ farmId: farm.id, name: "Pond B", type: "tarpaulin" as const, status: "active" as const });
  await repo.upsertPond(pondB);
  const cycleB = newRecord({
    pondId: pondB.id,
    species: "catfish" as const,
    stockingDate: daysAgo(21),
    fingerlingCount: 600,
    fingerlingUnitCostKobo: nairaToKobo(55),
    fingerlingWeightG: 5,
    targetWeightG: 1000,
    status: "active" as const,
  });
  await repo.upsertCycle(cycleB);
  for (let w = 0; w < 3; w++) {
    await repo.addFeedLog(
      newRecord({
        cycleId: cycleB.id,
        date: daysAgo(21 - w * 7),
        feedItemId: feedItem.id,
        feedKg: 3 + w,
        feedCostKobo: nairaToKobo((3 + w) * 1300),
      })
    );
    await repo.addWeightSample(
      newRecord({ cycleId: cycleB.id, date: daysAgo(21 - w * 7), avgWeightG: 5 + w * 25, sampleSize: 10 })
    );
  }

  // A market price to compare against
  await repo.addMarketPrice(
    newRecord({ farmId: farm.id, date: today(), pricePerKgKobo: nairaToKobo(3000), source: "local market" })
  );

  return { farmId: farm.id };
}
