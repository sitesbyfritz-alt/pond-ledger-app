"use client";

// Interactive end-of-cycle profit projection. Drives the pure
// projectedCycleProfitKobo engine function from four editable assumptions.
import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { projectedCycleProfitKobo, type ProjectionInput } from "@/lib/calculations";
import { formatNaira, nairaToKobo } from "@/lib/format";
import { Card } from "@/components/ui/card";

export function ProfitSimulator({
  base,
  defaults,
}: {
  base: Omit<ProjectionInput, "projectedTargetWeightG" | "projectedFcr" | "feedPricePerKgKobo" | "sellPricePerKgKobo">;
  defaults: { targetWeightG: number; fcr: number; feedPriceNaira: number; sellPriceNaira: number };
}) {
  const [target, setTarget] = useState(String(defaults.targetWeightG));
  const [fcr, setFcr] = useState(defaults.fcr.toFixed(2));
  const [feedPrice, setFeedPrice] = useState(String(defaults.feedPriceNaira));
  const [sellPrice, setSellPrice] = useState(String(defaults.sellPriceNaira));

  const result = useMemo(() => {
    return projectedCycleProfitKobo({
      ...base,
      projectedTargetWeightG: Number(target) || 0,
      projectedFcr: Number(fcr) || 0,
      feedPricePerKgKobo: nairaToKobo(Number(feedPrice) || 0),
      sellPricePerKgKobo: nairaToKobo(Number(sellPrice) || 0),
    });
  }, [base, target, fcr, feedPrice, sellPrice]);

  const profit = result.ok ? result.value : null;

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-value" />
        <h2 className="font-display text-sm font-semibold">Profit simulator</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Project end-of-cycle profit. Adjust the assumptions.</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Mini label="Target weight (g)" value={target} onChange={setTarget} />
        <Mini label="Expected FCR" value={fcr} onChange={setFcr} step />
        <Mini label="Feed ₦/kg" value={feedPrice} onChange={setFeedPrice} />
        <Mini label="Sell ₦/kg" value={sellPrice} onChange={setSellPrice} />
      </div>

      <div className="mt-5 rounded-xl bg-secondary/50 p-4 text-center">
        <p className="text-xs text-muted-foreground">Projected profit at harvest</p>
        {profit === null ? (
          <p className="mt-1 text-sm text-muted-foreground">{result.ok ? "" : result.reason}</p>
        ) : (
          <p className={`mt-1 font-display text-3xl font-semibold tabular ${profit >= 0 ? "text-profit" : "text-loss"}`}>
            {profit >= 0 ? "" : "−"}
            {formatNaira(Math.abs(profit))}
          </p>
        )}
      </div>
    </Card>
  );
}

function Mini({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        inputMode="decimal"
        onChange={(e) => onChange(e.target.value.replace(step ? /[^\d.]/g : /[^\d]/g, ""))}
        className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm tabular outline-none transition focus:border-primary focus-ring"
      />
    </label>
  );
}
