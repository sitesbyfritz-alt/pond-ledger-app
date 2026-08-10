"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { ArrowLeft, Droplets, Coins, Scale, Activity, HeartPulse, CalendarDays, Utensils, Skull, Flag } from "lucide-react";
import { useFarm, usePondBundle, useCloseCycle } from "@/hooks/use-pond-data";
import { computePondView } from "@/lib/pond-view";
import { formatNaira, formatNairaPerKg, formatKg, formatPct } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CostTrendChart } from "@/components/dashboard/cost-trend-chart";
import { ProfitSimulator } from "@/components/pond/profit-simulator";
import { MoneyPanel } from "@/components/pond/money-panel";

export default function PondDetailPage() {
  const params = useParams<{ id: string }>();
  const pondId = params.id;
  const { data: farm } = useFarm();
  const { data: bundle, isLoading } = usePondBundle(pondId);
  const closeCycle = useCloseCycle();
  const [confirmClose, setConfirmClose] = useState(false);

  const view = useMemo(() => {
    if (!bundle?.cycle) return null;
    return computePondView({
      cycle: bundle.cycle,
      feedLogs: bundle.feedLogs,
      mortality: bundle.mortality,
      samples: bundle.samples,
      expenses: bundle.expenses,
      marketPriceKobo: bundle.market?.pricePerKgKobo ?? null,
      feedPricePerKgKobo: farm?.defaultFeedPriceKobo ?? 0,
    });
  }, [bundle, farm]);

  if (isLoading) return <div className="surface h-96 animate-pulse" />;
  if (!bundle) return <Card>Pond not found. <Link href="/ponds" className="text-primary">Back to ponds</Link></Card>;

  const { pond, cycle } = bundle;

  return (
    <div className="space-y-6">
      <Link href="/ponds" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground focus-ring">
        <ArrowLeft className="h-4 w-4" /> Ponds
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <Droplets className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{pond.name}</h1>
            <p className="text-sm capitalize text-muted-foreground">
              {pond.type}
              {cycle ? ` · day ${view?.day ?? 0} · ${cycle.fingerlingCount.toLocaleString()} stocked` : " · no active cycle"}
            </p>
          </div>
        </div>
        {cycle && (
          <Button variant="outline" onClick={() => setConfirmClose(true)}>
            <Flag className="h-4 w-4" /> Close cycle
          </Button>
        )}
      </div>

      {!cycle || !view ? (
        <Card className="text-center text-sm text-muted-foreground">
          No active cycle on this pond. Start one from the <Link href="/ponds" className="text-primary">ponds page</Link>.
        </Card>
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Kpi icon={Coins} label="Cost / kg" tone="value" value={view.costPerKgKobo.ok ? formatNairaPerKg(view.costPerKgKobo.value) : "—"} sub={view.costPerKgKobo.ok ? "break-even now" : view.costPerKgKobo.reason} />
            <Kpi icon={Activity} label="FCR" value={view.fcr.ok ? view.fcr.value.toFixed(2) : "—"} sub={view.fcr.ok ? "feed : gain" : view.fcr.reason} />
            <Kpi icon={Scale} label="Biomass" tone="primary" value={view.biomassKg.ok ? formatKg(view.biomassKg.value) : "—"} sub={`${view.totalFeedKg.toFixed(0)} kg feed given`} />
            <Kpi icon={HeartPulse} label="Survival" value={view.survivalPct.ok ? formatPct(view.survivalPct.value) : "—"} />
            <Kpi
              icon={Coins}
              label="Margin / kg"
              tone={view.marginPerKgKobo === null ? "neutral" : view.marginPerKgKobo >= 0 ? "profit" : "loss"}
              value={view.marginPerKgKobo === null ? "—" : `${view.marginPerKgKobo >= 0 ? "+" : ""}${formatNaira(view.marginPerKgKobo)}`}
              sub={bundle.market ? `vs ${formatNairaPerKg(bundle.market.pricePerKgKobo)}` : "set a market price"}
            />
            <Kpi icon={CalendarDays} label="Total cost" value={formatNaira(view.totalCostKobo, { compact: true })} sub="feed + fingerlings + expenses" />
          </div>

          {/* Harvest advice */}
          {view.harvest && (
            <Card className={view.harvest.recommendHarvest ? "border-warning/40" : ""}>
              <div className="flex items-start gap-3">
                <Flag className={`mt-0.5 h-5 w-5 ${view.harvest.recommendHarvest ? "text-warning" : "text-profit"}`} />
                <div>
                  <p className="text-sm font-medium">{view.harvest.recommendHarvest ? "Consider harvesting" : "Keep growing"}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{view.harvest.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Next kg costs ~{formatNaira(view.harvest.marginalFeedCostKobo)} to feed · worth {formatNaira(view.harvest.marginalValueKobo)} at market.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="font-display text-sm font-semibold">Growth curve</h2>
              <GrowthChart data={view.growth} target={cycle.targetWeightG} />
            </Card>
            <Card>
              <h2 className="font-display text-sm font-semibold">Cost / kg trend</h2>
              <div className="mt-4">
                <CostTrendChart data={view.costTrend.map((c) => ({ label: c.label, costPerKg: c.costPerKgNaira }))} />
              </div>
            </Card>
          </div>

          {/* Money: expenses + sales */}
          <MoneyPanel
            pond={pond}
            cycle={cycle}
            expenses={bundle.expenses}
            sales={bundle.sales}
            totalCostKobo={view.totalCostKobo}
            defaultSellKobo={bundle.market?.pricePerKgKobo ?? 0}
          />

          {/* Decision tool */}
          <ProfitSimulator
            base={{
              cycle,
              feedLogs: bundle.feedLogs,
              mortalityLogs: bundle.mortality,
              samples: bundle.samples,
              expenses: bundle.expenses,
            }}
            defaults={{
              targetWeightG: cycle.targetWeightG,
              fcr: view.fcr.ok ? view.fcr.value : 1.5,
              feedPriceNaira: Math.round((farm?.defaultFeedPriceKobo ?? 0) / 100),
              sellPriceNaira: Math.round((bundle.market?.pricePerKgKobo ?? 0) / 100),
            }}
          />

          {/* Timeline */}
          <Timeline bundle={bundle} />
        </>
      )}

      {confirmClose && cycle && (
        <Card className="border-warning/40">
          <p className="text-sm font-medium">Close this cycle?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The pond becomes empty and ready for a new stocking. Records are kept. (Sales &amp; final profit come in Milestone 4.)
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await closeCycle.mutateAsync({ pond, cycle });
                setConfirmClose(false);
              }}
              disabled={closeCycle.isPending}
            >
              Yes, close cycle
            </Button>
            <Button variant="ghost" onClick={() => setConfirmClose(false)}>Cancel</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone = "neutral",
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  sub?: string;
  tone?: "value" | "primary" | "profit" | "loss" | "neutral";
}) {
  const toneText: Record<string, string> = {
    value: "text-value",
    primary: "text-primary",
    profit: "text-profit",
    loss: "text-loss",
    neutral: "text-foreground",
  };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <p className={`mt-2 font-display text-xl font-semibold tabular ${toneText[tone]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </motion.div>
  );
}

function GrowthChart({ data, target }: { data: { date: string; avgWeightG: number }[]; target: number }) {
  if (data.length < 2) {
    return <div className="grid h-48 place-items-center text-sm text-muted-foreground">Add two weight samples to see the growth curve.</div>;
  }
  const chart = data.map((d, i) => ({ label: `wk ${i + 1}`, g: d.avgWeightG }));
  return (
    <div className="mt-4 h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis width={40} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} domain={[0, Math.max(target, ...chart.map((c) => c.g))]} />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [`${v} g`, "Avg weight"]} />
          <Line type="monotone" dataKey="g" stroke="hsl(var(--value))" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Timeline({ bundle }: { bundle: NonNullable<ReturnType<typeof usePondBundle>["data"]> }) {
  type Row = { date: string; kind: "feed" | "death" | "sample"; text: string };
  const rows: Row[] = [
    ...bundle.feedLogs.map((f) => ({ date: f.date, kind: "feed" as const, text: `Fed ${f.feedKg} kg · ${formatNaira(f.feedCostKobo)}` })),
    ...bundle.mortality.map((m) => ({ date: m.date, kind: "death" as const, text: `${m.count} lost${m.cause ? ` · ${m.cause}` : ""}` })),
    ...bundle.samples.map((s) => ({ date: s.date, kind: "sample" as const, text: `Weighed ~${s.avgWeightG} g avg` })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);

  const icon = { feed: Utensils, death: Skull, sample: Scale };
  const color = { feed: "text-primary", death: "text-loss", sample: "text-value" };

  if (rows.length === 0) return null;
  return (
    <Card>
      <h2 className="font-display text-sm font-semibold">Recent activity</h2>
      <ul className="mt-3 flex flex-col divide-y divide-border/60">
        {rows.map((r, i) => {
          const Icon = icon[r.kind];
          return (
            <li key={i} className="flex items-center gap-3 py-2.5">
              <Icon className={`h-4 w-4 ${color[r.kind]}`} />
              <span className="flex-1 text-sm">{r.text}</span>
              <span className="text-xs text-muted-foreground">{r.date}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
