"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Droplets, ArrowUpRight, Fish } from "lucide-react";
import { useFarm, usePonds, useCreatePond, useStartCycle } from "@/hooks/use-pond-data";
import type { Pond } from "@/lib/types";
import { nairaToKobo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { Field, SelectField } from "@/components/ui/field";

const POND_TYPES = [
  { value: "concrete", label: "Concrete" },
  { value: "earthen", label: "Earthen" },
  { value: "tarpaulin", label: "Tarpaulin" },
  { value: "tank", label: "Tank" },
];

const statusStyle: Record<string, string> = {
  active: "text-profit bg-[hsl(var(--profit)/0.12)]",
  empty: "text-muted-foreground bg-secondary",
  ready: "text-value bg-[hsl(var(--value)/0.12)]",
  closed: "text-muted-foreground bg-secondary",
};

export default function PondsPage() {
  const { data: farm } = useFarm();
  const { data: ponds, isLoading } = usePonds(farm?.id);
  const [addOpen, setAddOpen] = useState(false);
  const [stockPond, setStockPond] = useState<Pond | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Ponds</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ponds?.length ?? 0} {(ponds?.length ?? 0) === 1 ? "pond" : "ponds"} on {farm?.name ?? "your farm"}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} disabled={!farm}>
          <Plus className="h-4 w-4" /> Add pond
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="surface h-28 animate-pulse" />
          ))}
        </div>
      ) : (ponds?.length ?? 0) === 0 ? (
        <Card className="flex flex-col items-center gap-4 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <Fish className="h-7 w-7" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold">No ponds yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Add your first pond to start tracking.</p>
          </div>
          <Button onClick={() => setAddOpen(true)} disabled={!farm}>
            <Plus className="h-4 w-4" /> Add your first pond
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {ponds!.map((pond, i) => (
            <motion.div
              key={pond.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
            >
              <Card interactive className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <Droplets className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium">{pond.name}</p>
                    <p className="text-xs capitalize text-muted-foreground">{pond.type}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyle[pond.status] ?? statusStyle.empty}`}>
                    {pond.status}
                  </span>
                  {pond.status === "active" ? (
                    <Link href={`/ponds/${pond.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary focus-ring">
                      View <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  ) : (
                    <button onClick={() => setStockPond(pond)} className="text-xs font-medium text-primary focus-ring">
                      Stock a cycle
                    </button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {farm && <AddPondSheet farmId={farm.id} open={addOpen} onClose={() => setAddOpen(false)} />}
      {stockPond && <StartCycleSheet pond={stockPond} onClose={() => setStockPond(null)} />}
    </div>
  );
}

function AddPondSheet({ farmId, open, onClose }: { farmId: string; open: boolean; onClose: () => void }) {
  const create = useCreatePond(farmId);
  const [name, setName] = useState("");
  const [type, setType] = useState("concrete");
  const [capacity, setCapacity] = useState("");

  async function submit() {
    await create.mutateAsync({
      name: name.trim(),
      type: type as Pond["type"],
      capacity: capacity ? Number(capacity) : undefined,
    });
    setName("");
    setCapacity("");
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add pond" description="Give it a name and type.">
      <Field label="Pond name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pond C" autoFocus />
      <SelectField label="Type" value={type} onChange={setType} options={POND_TYPES} />
      <Field
        label="Capacity (fish, optional)"
        value={capacity}
        inputMode="numeric"
        onChange={(e) => setCapacity(e.target.value.replace(/[^\d]/g, ""))}
        placeholder="e.g. 1000"
      />
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={!name.trim() || create.isPending}>
          <Plus className="h-4 w-4" /> Add pond
        </Button>
      </div>
    </Sheet>
  );
}

function StartCycleSheet({ pond, onClose }: { pond: Pond; onClose: () => void }) {
  const start = useStartCycle();
  const today = new Date().toISOString().slice(0, 10);
  const [stockingDate, setStockingDate] = useState(today);
  const [count, setCount] = useState("");
  const [unitCost, setUnitCost] = useState("50");
  const [target, setTarget] = useState("1000");

  async function submit() {
    await start.mutateAsync({
      pond,
      stockingDate,
      fingerlingCount: Number(count) || 0,
      fingerlingUnitCostKobo: nairaToKobo(Number(unitCost) || 0),
      targetWeightG: Number(target) || 1000,
    });
    onClose();
  }

  const valid = Number(count) > 0 && stockingDate;

  return (
    <Sheet open onClose={onClose} title={`Stock ${pond.name}`} description="Start a new grow-out cycle.">
      <Field label="Stocking date" type="date" value={stockingDate} onChange={(e) => setStockingDate(e.target.value)} max={today} />
      <Field
        label="Number of fingerlings"
        value={count}
        inputMode="numeric"
        onChange={(e) => setCount(e.target.value.replace(/[^\d]/g, ""))}
        placeholder="e.g. 1000"
        autoFocus
      />
      <Field
        label="Cost per fingerling"
        prefix="₦"
        value={unitCost}
        inputMode="numeric"
        onChange={(e) => setUnitCost(e.target.value.replace(/[^\d]/g, ""))}
      />
      <Field
        label="Target weight (g)"
        value={target}
        inputMode="numeric"
        onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ""))}
        hint="Typical market size is ~1000g."
      />
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={!valid || start.isPending}>
          <Fish className="h-4 w-4" /> Start cycle
        </Button>
      </div>
    </Sheet>
  );
}
