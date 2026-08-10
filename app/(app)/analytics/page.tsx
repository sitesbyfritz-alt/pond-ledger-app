"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Lightbulb, Sparkles, HeartPulse, BarChart3, LineChart, Fish, Plus, Download } from "lucide-react";
import { useFarm, useAnalytics } from "@/hooks/use-pond-data";
import { pondMetric, insights, type Insight } from "@/lib/analytics";
import { portfolioCsv } from "@/lib/report";
import { formatNaira, formatPct } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Feature flag: the AI insight panel enhances the local rules only when enabled.
const AI_ENABLED = process.env.NEXT_PUBLIC_ENABLE_AI_INSIGHTS === "true";

function downloadCsv(csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pondledger-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
  const { data: farm } = useFarm();
  const { data, isLoading } = useAnalytics(farm?.id);

  const { metrics, insightList } = useMemo(() => {
    const m = (data?.ponds ?? []).map((p) => pondMetric(p, data?.marketPriceKobo ?? null));
    return { metrics: m, insightList: insights(m, data?.marketPriceKobo ?? null) };
  }, [data]);

  if (isLoading) return <AnalyticsSkeleton />;

  if (metrics.length === 0) {
    return (
      <Card className="mx-auto mt-10 flex max-w-md flex-col items-center gap-4 py-14 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <Fish className="h-7 w-7" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">Nothing to analyze yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Stock a cycle and log a few days to see insights.</p>
        </div>
        <Link href="/ponds"><Button><Plus className="h-4 w-4" /> Go to ponds</Button></Link>
      </Card>
    );
  }

  const benchmark = metrics
    .filter((m) => m.costPerKgKobo !== null)
    .map((m) => ({
      name: m.name,
      cost: (m.costPerKgKobo as number) / 100,
      good: m.marginPerKgKobo === null ? true : m.marginPerKgKobo >= 0,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">How your ponds compare, and what to do next.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadCsv(portfolioCsv(metrics))}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <InsightPanel insights={insightList} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="font-display text-sm font-semibold">Cost / kg by pond</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Green = profitable at today&apos;s market price.</p>
          {benchmark.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">Add weight samples to compare cost per kg.</p>
          ) : (
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={benchmark} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis width={48} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => formatNaira(v * 100, { compact: true })} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--secondary))" }}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => [`${formatNaira(v * 100)}/kg`, "Cost/kg"]}
                  />
                  <Bar dataKey="cost" radius={[6, 6, 0, 0]}>
                    {benchmark.map((b, i) => (
                      <Cell key={i} fill={`hsl(var(--${b.good ? "profit" : "loss"}))`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <MortalityWatch metrics={metrics} />
      </div>

      <BenchmarkTable metrics={metrics} />
    </div>
  );
}

function InsightPanel({ insights }: { insights: Insight[] }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-value" />
          <h2 className="font-display text-sm font-semibold">Insights</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3" /> {AI_ENABLED ? "AI enhanced" : "On-device"}
        </span>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {insights.map((ins, i) => (
          <motion.li
            key={ins.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            className="flex items-start gap-3 rounded-xl bg-secondary/50 px-3 py-3"
          >
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ background: `hsl(var(--${ins.level === "good" ? "profit" : ins.level === "warn" ? "warning" : "primary"}))` }}
            />
            <div>
              <p className="text-sm font-medium leading-tight">{ins.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{ins.detail}</p>
            </div>
          </motion.li>
        ))}
      </ul>
      {!AI_ENABLED && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          These run entirely on your device. Add an AI key to enable deeper written analysis.
        </p>
      )}
    </Card>
  );
}

function MortalityWatch({ metrics }: { metrics: ReturnType<typeof pondMetric>[] }) {
  const sorted = [...metrics].sort((a, b) => (b.mortalityRatePct ?? 0) - (a.mortalityRatePct ?? 0));
  return (
    <Card>
      <div className="flex items-center gap-2">
        <HeartPulse className="h-4 w-4 text-loss" />
        <h2 className="font-display text-sm font-semibold">Mortality watch</h2>
      </div>
      <ul className="mt-3 flex flex-col divide-y divide-border/60">
        {sorted.map((m) => {
          const rate = m.mortalityRatePct ?? 0;
          const high = rate >= 10;
          return (
            <li key={m.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.mortalityCount} lost · day {m.day}</p>
              </div>
              <span className={`text-sm font-semibold tabular ${high ? "text-loss" : "text-muted-foreground"}`}>
                {m.mortalityRatePct === null ? "—" : formatPct(rate)}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function BenchmarkTable({ metrics }: { metrics: ReturnType<typeof pondMetric>[] }) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <LineChart className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm font-semibold">Benchmark</h2>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-2 font-medium">Pond</th>
              <th className="py-2 text-right font-medium">Cost/kg</th>
              <th className="py-2 text-right font-medium">FCR</th>
              <th className="py-2 text-right font-medium">Survival</th>
              <th className="py-2 text-right font-medium">Day</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.id} className="border-t border-border/60">
                <td className="py-2.5 font-medium">{m.name}</td>
                <td className="py-2.5 text-right tabular">{m.costPerKgKobo === null ? "—" : `${formatNaira(m.costPerKgKobo)}`}</td>
                <td className="py-2.5 text-right tabular">{m.fcr === null ? "—" : m.fcr.toFixed(2)}</td>
                <td className="py-2.5 text-right tabular">{m.survivalPct === null ? "—" : formatPct(m.survivalPct)}</td>
                <td className="py-2.5 text-right tabular">{m.day}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 animate-pulse rounded bg-secondary" />
      <div className="surface h-40 animate-pulse" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface h-72 animate-pulse" />
        <div className="surface h-72 animate-pulse" />
      </div>
    </div>
  );
}
