"use client";

// Milestone 1 — the real bento-grid dashboard.
// Pipeline unchanged from the scaffold: Dexie -> repository -> pure calc engine -> UI.
// This screen only READS through the repository and calc/portfolio functions.
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Coins, Fish, Scale, Wallet, Plus } from "lucide-react";
import { requestPersistentStorage } from "@/lib/db";
import { repo } from "@/lib/repository";
import {
  fcr,
  costPerKgKobo,
  currentBiomassKg,
  survivalPct,
  daysInCycle,
  marginPerKgKobo,
  latestAvgWeightG,
} from "@/lib/calculations";
import { portfolioSummary, type PondSlice, type PortfolioSummary } from "@/lib/portfolio";
import { formatNaira, formatNairaPerKg, formatKg, formatPct } from "@/lib/format";
import type { Farm, Cycle, FeedLog, MortalityLog, WeightSample, Expense } from "@/lib/types";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { PondCard, type PondCardData } from "@/components/dashboard/pond-card";
import { AttentionCard, type AttentionItem } from "@/components/dashboard/attention-card";
import { CostTrendChart, type TrendPoint } from "@/components/dashboard/cost-trend-chart";

interface DashboardData {
  farmName: string;
  summary: PortfolioSummary;
  marketPriceKobo: number | null;
  ponds: PondCardData[];
  attention: AttentionItem[];
  trend: TrendPoint[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    (async () => {
      await requestPersistentStorage();
      // Onboarding creates the farm (and optionally seeds demo data); the app
      // gate redirects first-run users there, so here we just read what exists.
      const farms = await repo.listFarms();
      const farm: Farm | undefined = farms[0];
      if (!farm) {
        setData({
          farmName: "Your farm",
          summary: portfolioSummary({ ponds: [], marketPriceKobo: null }),
          marketPriceKobo: null,
          ponds: [],
          attention: [],
          trend: [],
        });
        return;
      }

      const market = await repo.latestMarketPrice(farm.id);
      const marketPriceKobo = market?.pricePerKgKobo ?? null;
      const ponds = await repo.listPonds(farm.id);

      const cards: PondCardData[] = [];
      const attention: AttentionItem[] = [];
      const slices: PondSlice[] = [];
      // Full records (they carry `date`) for the pond that drives the trend chart.
      let trendSource: {
        cycle: Cycle;
        feedLogs: FeedLog[];
        mortality: MortalityLog[];
        samples: WeightSample[];
        expenses: Expense[];
      } | null = null;

      for (const pond of ponds) {
        const cycle = await repo.getActiveCycle(pond.id);
        if (!cycle) continue;
        const feedLogs = await repo.listFeedLogs(cycle.id);
        const mortality = await repo.listMortality(cycle.id);
        const samples = await repo.listWeightSamples(cycle.id);
        const expenses = await repo.listExpenses(cycle.id);

        const slice: PondSlice = {
          cycle,
          feedLogs,
          mortalityLogs: mortality,
          samples,
          expenses,
        };
        slices.push(slice);

        const fcrR = fcr(cycle, feedLogs, mortality, samples);
        const cpkR = costPerKgKobo(cycle, feedLogs, mortality, samples, expenses);
        const bioR = currentBiomassKg(cycle, mortality, samples);
        const survR = survivalPct(cycle.fingerlingCount, mortality);

        let verdict: PondCardData["verdict"] = null;
        if (cpkR.ok && marketPriceKobo !== null) {
          const m = marginPerKgKobo(marketPriceKobo, cpkR.value);
          verdict = {
            label: `${m >= 0 ? "+" : ""}${formatNaira(m)}/kg vs market`,
            good: m >= 0,
          };
        }

        const spark = [...samples]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((s) => s.avgWeightG);

        cards.push({
          id: pond.id,
          name: pond.name,
          type: pond.type,
          day: daysInCycle(cycle.stockingDate),
          costPerKg: cpkR.ok ? formatNairaPerKg(cpkR.value) : "—",
          fcr: fcrR.ok ? fcrR.value.toFixed(2) : "—",
          biomass: bioR.ok ? formatKg(bioR.value) : "—",
          survival: survR.ok ? formatPct(survR.value) : "—",
          verdict,
          spark,
        });

        // --- Attention rules (cheap, per pond) ---
        if (samples.length === 0) {
          attention.push({
            id: `${pond.id}-nosample`,
            level: "info",
            title: `${pond.name}: add a weight sample`,
            detail: "Weigh a few fish to unlock cost/kg and FCR.",
          });
        } else {
          const avg = latestAvgWeightG(samples) ?? 0;
          if (avg >= cycle.targetWeightG * 0.85) {
            attention.push({
              id: `${pond.id}-harvest`,
              level: "warning",
              title: `${pond.name}: nearing harvest weight`,
              detail: `Avg ~${Math.round(avg)}g of ${cycle.targetWeightG}g target. Check the harvest window.`,
            });
          }
        }
        const spike = mortality.find((m) => m.count > cycle.fingerlingCount * 0.05);
        if (spike) {
          attention.push({
            id: `${pond.id}-mortality`,
            level: "warning",
            title: `${pond.name}: mortality spike`,
            detail: `${spike.count} lost on ${spike.date}${spike.cause ? ` (${spike.cause})` : ""}.`,
          });
        }

        // Trend uses the pond with the most weight samples.
        if (!trendSource || samples.length > trendSource.samples.length) {
          trendSource = { cycle, feedLogs, mortality, samples, expenses };
        }
      }

      // Build a real cost/kg trend by date-slicing the chosen pond's logs:
      // at each weight-sample date, cost so far / biomass then.
      const trend: TrendPoint[] = [];
      if (trendSource) {
        const src = trendSource;
        const dates = [...src.samples].sort((a, b) => a.date.localeCompare(b.date)).map((s) => s.date);
        dates.forEach((date, i) => {
          const upto = <T extends { date: string }>(rows: T[]) => rows.filter((r) => r.date <= date);
          const r = costPerKgKobo(
            src.cycle,
            upto(src.feedLogs),
            upto(src.mortality),
            upto(src.samples),
            src.expenses
          );
          if (r.ok) trend.push({ label: `wk ${i + 1}`, costPerKg: r.value / 100 });
        });
      }

      const summary = portfolioSummary({ ponds: slices, marketPriceKobo });

      setData({
        farmName: farm.name,
        summary,
        marketPriceKobo,
        ponds: cards,
        attention,
        trend,
      });
    })();
  }, []);

  if (data === null) return <DashboardSkeleton />;

  const { summary, marketPriceKobo } = data;
  const marginTone = summary.marginPerKgKobo === null ? "neutral" : summary.marginPerKgKobo >= 0 ? "profit" : "loss";

  return (
    <div className="space-y-8">
      <Header farmName={data.farmName} pondCount={data.ponds.length} />

      {data.ponds.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid-bento">
          {/* Row 1 — portfolio KPIs */}
          <KpiTile
            label="Blended cost / kg"
            icon={Coins}
            value={summary.blendedCostPerKgKobo === null ? null : summary.blendedCostPerKgKobo / 100}
            format={(n) => `${formatNaira(n * 100)}`}
            caption="Break-even across all ponds"
            tone="value"
            index={0}
          />
          <KpiTile
            label="Total biomass"
            icon={Scale}
            value={summary.totalBiomassKg > 0 ? summary.totalBiomassKg : null}
            format={(n) => formatKg(n)}
            caption={`${summary.pondsWithBiomass} of ${summary.activePonds} ponds valued`}
            tone="primary"
            index={1}
          />
          <KpiTile
            label="Cash in feed"
            icon={Wallet}
            value={summary.cashInFeedKobo / 100}
            format={(n) => formatNaira(n * 100, { compact: true })}
            caption="Feed spend to date"
            tone="neutral"
            index={2}
          />
          <KpiTile
            label="Margin vs market"
            icon={Fish}
            value={summary.marginPerKgKobo === null ? null : summary.marginPerKgKobo / 100}
            format={(n) => `${n >= 0 ? "+" : ""}${formatNaira(n * 100)}`}
            caption={marketPriceKobo ? `vs ${formatNairaPerKg(marketPriceKobo)} market` : undefined}
            empty="Set a market price"
            tone={marginTone}
            index={3}
          />

          {/* Row 2 — trend + attention */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="surface p-5 lg:col-span-7"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold">Cost / kg trend</h2>
              <span className="text-xs text-muted-foreground">Falls as fish grow into their feed</span>
            </div>
            <div className="mt-4">
              <CostTrendChart data={data.trend} />
            </div>
          </motion.div>

          <AttentionCard items={data.attention} />

          {/* Row 3 — per-pond cards */}
          {data.ponds.map((p, i) => (
            <div key={p.id} className="lg:col-span-6">
              <PondCard data={p} index={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Header({ farmName, pondCount }: { farmName: string; pondCount: number }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{farmName}</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Portfolio
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {pondCount} active {pondCount === 1 ? "pond" : "ponds"} · what a kilo is costing you right now
        </p>
      </div>
      <Link
        href="/log"
        className="hidden items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-ring sm:inline-flex"
      >
        <Plus className="h-4 w-4" /> Log feeding
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="surface flex flex-col items-center justify-center gap-4 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <Fish className="h-7 w-7" />
      </span>
      <div>
        <h2 className="font-display text-lg font-semibold">No ponds yet</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Add your first pond and stock a cycle to start seeing live cost per kilo.
        </p>
      </div>
      <Link
        href="/ponds"
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-ring"
      >
        <Plus className="h-4 w-4" /> Add your first pond
      </Link>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-4 w-28 animate-pulse rounded bg-secondary" />
        <div className="h-8 w-40 animate-pulse rounded bg-secondary" />
      </div>
      <div className="grid-bento">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="surface h-32 animate-pulse lg:col-span-3" />
        ))}
        <div className="surface h-56 animate-pulse lg:col-span-7" />
        <div className="surface h-56 animate-pulse lg:col-span-5" />
        {[0, 1].map((i) => (
          <div key={i} className="surface h-48 animate-pulse lg:col-span-6" />
        ))}
      </div>
    </div>
  );
}
