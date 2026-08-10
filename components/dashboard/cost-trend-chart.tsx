"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNaira } from "@/lib/format";

export interface TrendPoint {
  /** short axis label, e.g. "wk 3" */
  label: string;
  /** cost per kg in naira (display units) */
  costPerKg: number;
}

/** Blended cost/kg over the cycle. Custom teal gradient, draws in on mount. */
export function CostTrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="grid h-48 place-items-center text-sm text-muted-foreground">
        Cost/kg trend appears once there are a few weight samples.
      </div>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            interval="preserveStartEnd"
          />
          <YAxis
            width={44}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v: number) => formatNaira(v * 100, { compact: true })}
          />
          <Tooltip
            cursor={{ stroke: "hsl(var(--border))" }}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            formatter={(v: number) => [`${formatNaira(v * 100)}/kg`, "Cost/kg"]}
          />
          <Area
            type="monotone"
            dataKey="costPerKg"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#costFill)"
            animationDuration={900}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
