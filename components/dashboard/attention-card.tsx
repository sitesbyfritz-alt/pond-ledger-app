"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, CircleDot, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type AttentionLevel = "warning" | "info";

export interface AttentionItem {
  id: string;
  level: AttentionLevel;
  title: string;
  detail: string;
}

const levelIcon: Record<AttentionLevel, LucideIcon> = {
  warning: AlertTriangle,
  info: CircleDot,
};
const levelColor: Record<AttentionLevel, string> = {
  warning: "text-warning",
  info: "text-primary",
};

export function AttentionCard({ items }: { items: AttentionItem[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="surface flex flex-col p-5 lg:col-span-5"
    >
      <h2 className="font-display text-sm font-semibold">Needs attention</h2>

      {items.length === 0 ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <CheckCircle2 className="h-6 w-6 text-profit" />
          <p className="text-sm text-muted-foreground">All ponds look healthy.</p>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item) => {
            const Icon = levelIcon[item.level];
            return (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-xl bg-secondary/50 px-3 py-2.5"
              >
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", levelColor[item.level])} />
                <div>
                  <p className="text-sm font-medium leading-tight">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}
