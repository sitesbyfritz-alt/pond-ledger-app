"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { Droplets, ArrowUpRight } from "lucide-react";

export interface PondCardData {
  id: string;
  name: string;
  type: string;
  day: number;
  costPerKg: string;
  fcr: string;
  biomass: string;
  survival: string;
  verdict: { label: string; good: boolean } | null;
  /** avg weight (g) per sample, oldest→newest, for the sparkline */
  spark: number[];
}

export function PondCard({ data, index = 0 }: { data: PondCardData; index?: number }) {
  const sparkData = data.spark.map((g, i) => ({ i, g }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={`/ponds/${data.id}`}
        className="surface surface-hover block p-5 focus-ring"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Droplets className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium leading-tight">{data.name}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {data.type} · day {data.day}
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Headline: what a kilo is costing right now */}
        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Cost / kg now</p>
            <p className="font-display text-3xl font-semibold text-primary tabular">
              {data.costPerKg}
            </p>
          </div>
          {data.spark.length >= 2 && (
            <div className="h-10 w-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <Line
                    type="monotone"
                    dataKey="g"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {data.verdict && (
          <span
            className="mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
            style={{
              color: `hsl(var(--${data.verdict.good ? "profit" : "loss"}))`,
              background: `hsl(var(--${data.verdict.good ? "profit" : "loss"}) / 0.12)`,
            }}
          >
            {data.verdict.label}
          </span>
        )}

        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-border/60 pt-4">
          <Stat label="FCR" value={data.fcr} />
          <Stat label="Biomass" value={data.biomass} />
          <Stat label="Survival" value={data.survival} />
        </dl>
      </Link>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular">{value}</dd>
    </div>
  );
}
