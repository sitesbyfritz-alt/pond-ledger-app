"use client";

// Per-cycle money: expenses in, sales out. Both write through the data hooks.
import { useState } from "react";
import { Plus, Receipt, Banknote, TrendingUp } from "lucide-react";
import type { Pond, Cycle, Expense, Sale } from "@/lib/types";
import { useAddExpense, useAddSale } from "@/hooks/use-pond-data";
import { salesSummary, realizedNetKobo } from "@/lib/money";
import { formatNaira, formatNairaPerKg, formatKg, nairaToKobo } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SelectField, Field } from "@/components/ui/field";

const today = () => new Date().toISOString().slice(0, 10);

const EXPENSE_CATEGORIES = [
  { value: "feed", label: "Feed" },
  { value: "fingerlings", label: "Fingerlings" },
  { value: "labor", label: "Labor" },
  { value: "power", label: "Power" },
  { value: "medication", label: "Medication" },
  { value: "water", label: "Water" },
  { value: "equipment", label: "Equipment" },
  { value: "misc", label: "Misc" },
];

const SALES_CHANNELS = [
  { value: "middleman", label: "Middleman" },
  { value: "direct", label: "Direct" },
  { value: "restaurant", label: "Restaurant" },
  { value: "retail", label: "Retail" },
];

export function MoneyPanel({
  pond,
  cycle,
  expenses,
  sales,
  totalCostKobo,
  defaultSellKobo,
}: {
  pond: Pond;
  cycle: Cycle;
  expenses: Expense[];
  sales: Sale[];
  totalCostKobo: number;
  defaultSellKobo: number;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ExpensesCard pond={pond} cycle={cycle} expenses={expenses} />
      <SalesCard pond={pond} cycle={cycle} sales={sales} totalCostKobo={totalCostKobo} defaultSellKobo={defaultSellKobo} />
    </div>
  );
}

function ExpensesCard({ pond, cycle, expenses }: { pond: Pond; cycle: Cycle; expenses: Expense[] }) {
  const add = useAddExpense();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("misc");
  const [amount, setAmount] = useState("");
  const total = expenses.reduce((s, e) => s + e.amountKobo, 0);

  async function submit() {
    if (!(Number(amount) > 0)) return;
    await add.mutateAsync({
      pond,
      cycleId: cycle.id,
      farmId: pond.farmId,
      date: today(),
      category: category as Expense["category"],
      amountKobo: nairaToKobo(Number(amount)),
    });
    setAmount("");
    setOpen(false);
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold">Expenses</h2>
        </div>
        <span className="text-sm font-semibold tabular">{formatNaira(total)}</span>
      </div>

      {expenses.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-border/60">
          {[...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((e) => (
            <li key={e.id} className="flex items-center justify-between py-2 text-sm">
              <span className="capitalize">{e.category}</span>
              <span className="flex items-center gap-3">
                <span className="tabular">{formatNaira(e.amountKobo)}</span>
                <span className="text-xs text-muted-foreground">{e.date}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div className="mt-3 rounded-xl bg-secondary/40 p-3">
          <SelectField label="Category" value={category} onChange={setCategory} options={EXPENSE_CATEGORIES} />
          <Field label="Amount" prefix="₦" value={amount} inputMode="numeric" onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} autoFocus />
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={submit} disabled={!(Number(amount) > 0) || add.isPending}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary focus-ring">
          <Plus className="h-3.5 w-3.5" /> Add expense
        </button>
      )}
    </Card>
  );
}

function SalesCard({
  pond,
  cycle,
  sales,
  totalCostKobo,
  defaultSellKobo,
}: {
  pond: Pond;
  cycle: Cycle;
  sales: Sale[];
  totalCostKobo: number;
  defaultSellKobo: number;
}) {
  const add = useAddSale();
  const [open, setOpen] = useState(false);
  const [kg, setKg] = useState("");
  const [price, setPrice] = useState(defaultSellKobo ? String(Math.round(defaultSellKobo / 100)) : "");
  const [channel, setChannel] = useState("middleman");
  const [buyer, setBuyer] = useState("");

  const summary = salesSummary(sales);
  const net = realizedNetKobo(summary.revenueKobo, totalCostKobo);

  async function submit() {
    if (!(Number(kg) > 0 && Number(price) > 0)) return;
    await add.mutateAsync({
      pond,
      cycleId: cycle.id,
      date: today(),
      channel: channel as Sale["channel"],
      kg: Number(kg),
      pricePerKgKobo: nairaToKobo(Number(price)),
      buyerName: buyer.trim() || undefined,
    });
    setKg("");
    setBuyer("");
    setOpen(false);
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Banknote className="h-4 w-4 text-profit" />
          <h2 className="font-display text-sm font-semibold">Sales</h2>
        </div>
        <span className="text-sm font-semibold tabular text-profit">{formatNaira(summary.revenueKobo)}</span>
      </div>

      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span>{formatKg(summary.totalKg)} sold</span>
        {summary.avgPricePerKgKobo !== null && <span>avg {formatNairaPerKg(summary.avgPricePerKgKobo)}</span>}
        <span className="ml-auto inline-flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          net{" "}
          <span className={net >= 0 ? "text-profit" : "text-loss"}>
            {net >= 0 ? "" : "−"}
            {formatNaira(Math.abs(net))}
          </span>
        </span>
      </div>

      {sales.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-border/60">
          {[...sales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2 text-sm">
              <span>{formatKg(s.kg)} · <span className="capitalize text-muted-foreground">{s.channel}</span></span>
              <span className="tabular">{formatNaira(Math.round(s.kg * s.pricePerKgKobo))}</span>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div className="mt-3 rounded-xl bg-secondary/40 p-3">
          <Field label="Weight sold (kg)" value={kg} inputMode="decimal" onChange={(e) => setKg(e.target.value.replace(/[^\d.]/g, ""))} autoFocus />
          <Field label="Price / kg" prefix="₦" value={price} inputMode="numeric" onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))} />
          <SelectField label="Channel" value={channel} onChange={setChannel} options={SALES_CHANNELS} />
          <Field label="Buyer (optional)" value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="Name" />
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={submit} disabled={!(Number(kg) > 0 && Number(price) > 0) || add.isPending}>Record sale</Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary focus-ring">
          <Plus className="h-3.5 w-3.5" /> Record sale
        </button>
      )}
    </Card>
  );
}
