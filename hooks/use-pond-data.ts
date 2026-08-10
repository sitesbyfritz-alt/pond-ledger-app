"use client";

// Data hooks: the ONLY thing components use to read/write pond data. Each wraps the
// repository (never Dexie) and mutations invalidate the right query keys so screens
// — including the daily log's effect on a pond — stay live and offline-correct.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { repo, newRecord } from "@/lib/repository";
import type { Pond, Cycle, FeedLog, MortalityLog, WeightSample, Expense, Farm, MarketPrice, Sale, FeedItem } from "@/lib/types";

type ExpenseCat = Expense["category"];
type SaleChan = Sale["channel"];

export const keys = {
  farm: ["farm"] as const,
  ponds: (farmId: string) => ["ponds", farmId] as const,
  bundle: (pondId: string) => ["pond-bundle", pondId] as const,
  market: (farmId: string) => ["market", farmId] as const,
  feedItems: (farmId: string) => ["feed-items", farmId] as const,
};

/** The single farm (v1 is single-farm). */
export function useFarm() {
  return useQuery({
    queryKey: keys.farm,
    queryFn: async (): Promise<Farm | undefined> => (await repo.listFarms())[0],
  });
}

export function usePonds(farmId: string | undefined) {
  return useQuery({
    queryKey: keys.ponds(farmId ?? "none"),
    enabled: !!farmId,
    queryFn: () => repo.listPonds(farmId as string),
  });
}

export function useMarketPrice(farmId: string | undefined) {
  return useQuery({
    queryKey: keys.market(farmId ?? "none"),
    enabled: !!farmId,
    queryFn: () => repo.latestMarketPrice(farmId as string),
  });
}

export interface PondBundle {
  pond: Pond;
  cycle?: Cycle;
  feedLogs: FeedLog[];
  mortality: MortalityLog[];
  samples: WeightSample[];
  expenses: Expense[];
  sales: Sale[];
  market?: MarketPrice;
}

/** Everything a pond detail / log confirmation needs, in one query. */
export function usePondBundle(pondId: string | undefined) {
  return useQuery({
    queryKey: keys.bundle(pondId ?? "none"),
    enabled: !!pondId,
    queryFn: async (): Promise<PondBundle | null> => {
      const pond = await repo.getPond(pondId as string);
      if (!pond) return null;
      const cycle = await repo.getActiveCycle(pond.id);
      const market = await repo.latestMarketPrice(pond.farmId);
      if (!cycle) {
        return { pond, feedLogs: [], mortality: [], samples: [], expenses: [], sales: [], market };
      }
      const [feedLogs, mortality, samples, expenses, sales] = await Promise.all([
        repo.listFeedLogs(cycle.id),
        repo.listMortality(cycle.id),
        repo.listWeightSamples(cycle.id),
        repo.listExpenses(cycle.id),
        repo.listSales(cycle.id),
      ]);
      return { pond, cycle, feedLogs, mortality, samples, expenses, sales, market };
    },
  });
}

/** Invalidate everything that could change after a write to `pondId`'s farm. */
function useInvalidatePond() {
  const qc = useQueryClient();
  return (pondId: string, farmId?: string) => {
    qc.invalidateQueries({ queryKey: keys.bundle(pondId) });
    if (farmId) qc.invalidateQueries({ queryKey: keys.ponds(farmId) });
    qc.invalidateQueries({ queryKey: keys.farm });
  };
}

// ---- Pond & cycle mutations ----

export function useCreatePond(farmId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; type: Pond["type"]; capacity?: number }) => {
      const pond = newRecord({
        farmId,
        name: input.name,
        type: input.type,
        capacity: input.capacity,
        status: "empty" as const,
      });
      await repo.upsertPond(pond as Pond);
      return pond as Pond;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ponds(farmId) }),
  });
}

export interface StartCycleInput {
  pond: Pond;
  stockingDate: string;
  fingerlingCount: number;
  fingerlingUnitCostKobo: number;
  targetWeightG: number;
}

export function useStartCycle() {
  const invalidate = useInvalidatePond();
  return useMutation({
    mutationFn: async (input: StartCycleInput) => {
      const cycle = newRecord({
        pondId: input.pond.id,
        species: "catfish" as const,
        stockingDate: input.stockingDate,
        fingerlingCount: input.fingerlingCount,
        fingerlingUnitCostKobo: input.fingerlingUnitCostKobo,
        fingerlingWeightG: 5,
        targetWeightG: input.targetWeightG,
        status: "active" as const,
      });
      await repo.upsertCycle(cycle as Cycle);
      await repo.upsertPond({ ...input.pond, status: "active" });
      return cycle as Cycle;
    },
    onSuccess: (_c, input) => invalidate(input.pond.id, input.pond.farmId),
  });
}

export function useCloseCycle() {
  const invalidate = useInvalidatePond();
  return useMutation({
    mutationFn: async (input: { pond: Pond; cycle: Cycle }) => {
      await repo.upsertCycle({ ...input.cycle, status: "closed" });
      await repo.upsertPond({ ...input.pond, status: "empty" });
    },
    onSuccess: (_r, input) => invalidate(input.pond.id, input.pond.farmId),
  });
}

// ---- Daily-log mutations ----

export function useAddFeedLog() {
  const invalidate = useInvalidatePond();
  return useMutation({
    mutationFn: async (input: {
      pond: Pond;
      cycleId: string;
      date: string;
      feedKg: number;
      feedCostKobo: number;
      feedItemId?: string | null;
      note?: string;
    }) => {
      await repo.addFeedLog(
        newRecord({
          cycleId: input.cycleId,
          date: input.date,
          feedItemId: input.feedItemId ?? null,
          feedKg: input.feedKg,
          feedCostKobo: input.feedCostKobo,
          note: input.note,
        }) as FeedLog
      );
    },
    onSuccess: (_r, input) => invalidate(input.pond.id, input.pond.farmId),
  });
}

export function useAddMortality() {
  const invalidate = useInvalidatePond();
  return useMutation({
    mutationFn: async (input: { pond: Pond; cycleId: string; date: string; count: number; cause?: string }) => {
      await repo.addMortality(
        newRecord({ cycleId: input.cycleId, date: input.date, count: input.count, cause: input.cause }) as MortalityLog
      );
    },
    onSuccess: (_r, input) => invalidate(input.pond.id, input.pond.farmId),
  });
}

export function useAddWeightSample() {
  const invalidate = useInvalidatePond();
  return useMutation({
    mutationFn: async (input: {
      pond: Pond;
      cycleId: string;
      date: string;
      avgWeightG: number;
      sampleSize: number;
    }) => {
      await repo.addWeightSample(
        newRecord({
          cycleId: input.cycleId,
          date: input.date,
          avgWeightG: input.avgWeightG,
          sampleSize: input.sampleSize,
        }) as WeightSample
      );
    },
    onSuccess: (_r, input) => invalidate(input.pond.id, input.pond.farmId),
  });
}

// ---- Money: expenses, sales, feed inventory, market price ----

export function useAddExpense() {
  const invalidate = useInvalidatePond();
  return useMutation({
    mutationFn: async (input: {
      pond: Pond;
      cycleId: string;
      farmId: string;
      date: string;
      category: ExpenseCat;
      amountKobo: number;
      note?: string;
    }) => {
      await repo.addExpense(
        newRecord({
          cycleId: input.cycleId,
          farmId: input.farmId,
          date: input.date,
          category: input.category,
          amountKobo: input.amountKobo,
          note: input.note,
        }) as Expense
      );
    },
    onSuccess: (_r, input) => invalidate(input.pond.id, input.pond.farmId),
  });
}

export function useAddSale() {
  const invalidate = useInvalidatePond();
  return useMutation({
    mutationFn: async (input: {
      pond: Pond;
      cycleId: string;
      date: string;
      channel: SaleChan;
      kg: number;
      pricePerKgKobo: number;
      buyerName?: string;
    }) => {
      await repo.addSale(
        newRecord({
          cycleId: input.cycleId,
          date: input.date,
          channel: input.channel,
          kg: input.kg,
          pricePerKgKobo: input.pricePerKgKobo,
          buyerName: input.buyerName,
        }) as Sale
      );
    },
    onSuccess: (_r, input) => invalidate(input.pond.id, input.pond.farmId),
  });
}

export function useFeedItems(farmId: string | undefined) {
  return useQuery({
    queryKey: keys.feedItems(farmId ?? "none"),
    enabled: !!farmId,
    queryFn: () => repo.listFeedItems(farmId as string),
  });
}

export function useUpsertFeedItem(farmId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: FeedItem) => {
      await repo.upsertFeedItem(item);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.feedItems(farmId) }),
  });
}

export interface AnalyticsData {
  ponds: import("@/lib/analytics").AnalyticsPond[];
  marketPriceKobo: number | null;
}

export function useAnalytics(farmId: string | undefined) {
  return useQuery<AnalyticsData>({
    queryKey: ["analytics", farmId ?? "none"],
    enabled: !!farmId,
    queryFn: async () => {
      const id = farmId as string;
      const market = await repo.latestMarketPrice(id);
      const ponds = await repo.listPonds(id);
      const result: AnalyticsData["ponds"] = [];
      for (const pond of ponds) {
        const cycle = await repo.getActiveCycle(pond.id);
        if (!cycle) continue;
        const [feedLogs, mortality, samples, expenses] = await Promise.all([
          repo.listFeedLogs(cycle.id),
          repo.listMortality(cycle.id),
          repo.listWeightSamples(cycle.id),
          repo.listExpenses(cycle.id),
        ]);
        result.push({
          id: pond.id,
          name: pond.name,
          cycle: {
            fingerlingCount: cycle.fingerlingCount,
            fingerlingUnitCostKobo: cycle.fingerlingUnitCostKobo,
            fingerlingWeightG: cycle.fingerlingWeightG,
            stockingDate: cycle.stockingDate,
            targetWeightG: cycle.targetWeightG,
          },
          feedLogs,
          mortality,
          samples,
          expenses,
        });
      }
      return { ponds: result, marketPriceKobo: market?.pricePerKgKobo ?? null };
    },
  });
}

export function useSetMarketPrice(farmId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { date: string; pricePerKgKobo: number; source?: string }) => {
      await repo.addMarketPrice(
        newRecord({
          farmId,
          date: input.date,
          pricePerKgKobo: input.pricePerKgKobo,
          source: input.source,
        }) as MarketPrice
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.market(farmId) });
      qc.invalidateQueries({ queryKey: keys.ponds(farmId) });
    },
  });
}
