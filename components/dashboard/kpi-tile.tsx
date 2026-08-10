"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "./count-up";

type Tone = "value" | "primary" | "profit" | "loss" | "neutral";

const toneText: Record<Tone, string> = {
  value: "text-value",
  primary: "text-primary",
  profit: "text-profit",
  loss: "text-loss",
  neutral: "text-foreground",
};

export interface KpiTileProps {
  label: string;
  icon: LucideIcon;
  /** Numeric value to count up to; null renders the `empty` state. */
  value: number | null;
  format: (n: number) => string;
  /** Small caption under the value (e.g. "vs ₦3,000/kg market"). */
  caption?: string;
  /** Shown when value is null ("not enough data" style). */
  empty?: string;
  tone?: Tone;
  /** Grid span on the 12-col desktop bento. */
  span?: string;
  index?: number;
}

export function KpiTile({
  label,
  icon: Icon,
  value,
  format,
  caption,
  empty = "Not enough data yet",
  tone = "neutral",
  span = "lg:col-span-3",
  index = 0,
}: KpiTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className={cn("surface p-5", span)}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Icon className={cn("h-4 w-4", tone === "neutral" ? "text-muted-foreground" : toneText[tone])} />
      </div>

      {value === null ? (
        <p className="mt-4 text-2xl font-semibold text-muted-foreground">—</p>
      ) : (
        <CountUp
          value={value}
          format={format}
          className={cn("mt-4 block font-display text-3xl font-semibold tabular", toneText[tone])}
        />
      )}

      <p className="mt-1.5 text-xs text-muted-foreground">
        {value === null ? empty : caption}
      </p>
    </motion.div>
  );
}
