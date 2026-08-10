"use client";

// The daily log — built for speed. Pick a pond, type feed kg, Save. Cost auto-fills
// from the farm feed price and yesterday's amount is prefilled, so the common case is
// two taps and a number. Mortality and weight sample are optional expanders.
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Fish, Plus, Scale, Skull, Loader2 } from "lucide-react";
import { useFarm, usePonds, usePondBundle, useAddFeedLog, useAddMortality, useAddWeightSample, useAnalytics } from "@/hooks/use-pond-data";
import { dueReminders, type PondFeedState } from "@/lib/reminders";
import { formatNaira, nairaToKobo } from "@/lib/format";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const today = () => new Date().toISOString().slice(0, 10);

function RemindersStrip({ farmId }: { farmId: string }) {
  const { data } = useAnalytics(farmId);
  const latest = (rows: { date: string }[]): string | null =>
    rows.length ? rows.map((r) => r.date).sort().slice(-1)[0] : null;
  const states: PondFeedState[] = (data?.ponds ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    // analytics feedLogs are FeedLogInput at the type level but carry `date` at
    // runtime (they come straight from the repository), so read it explicitly.
    lastFeedDate: latest(p.feedLogs as unknown as { date: string }[]),
    lastSampleDate: latest(p.samples),
  }));
  const reminders = dueReminders(states, today());
  if (reminders.length === 0) return null;

  return (
    <div className="surface p-4">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-value" />
        <h2 className="text-sm font-semibold">Today&apos;s reminders</h2>
      </div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {reminders.slice(0, 4).map((r) => (
          <li key={r.id} className="text-xs text-muted-foreground">
            • {r.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LogPage() {
  const { data: farm } = useFarm();
  const { data: ponds } = usePonds(farm?.id);
  const active = useMemo(() => (ponds ?? []).filter((p) => p.status === "active"), [ponds]);
  const [pondId, setPondId] = useState<string | null>(null);
  const selectedId = pondId ?? active[0]?.id ?? null;

  if (farm && active.length === 0) {
    return (
      <Card className="mx-auto mt-10 flex max-w-md flex-col items-center gap-4 py-14 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <Fish className="h-7 w-7" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">No active ponds to log</h2>
          <p className="mt-1 text-sm text-muted-foreground">Stock a cycle first, then log feeding here.</p>
        </div>
        <Link href="/ponds"><Button><Plus className="h-4 w-4" /> Go to ponds</Button></Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Log feeding</h1>
        <p className="mt-1 text-sm text-muted-foreground">Under 30 seconds. Pick a pond and enter today&apos;s feed.</p>
      </div>

      {farm && <RemindersStrip farmId={farm.id} />}

      {active.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {active.map((p) => (
            <button
              key={p.id}
              onClick={() => setPondId(p.id)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition focus-ring",
                selectedId === p.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {selectedId && <LogForm key={selectedId} pondId={selectedId} defaultFeedPriceKobo={farm?.defaultFeedPriceKobo ?? 0} />}
    </div>
  );
}

function LogForm({ pondId, defaultFeedPriceKobo }: { pondId: string; defaultFeedPriceKobo: number }) {
  const { data: bundle, isLoading } = usePondBundle(pondId);
  const addFeed = useAddFeedLog();
  const addMortality = useAddMortality();
  const addSample = useAddWeightSample();

  const [date, setDate] = useState(today());
  const [feedKg, setFeedKg] = useState("");
  const [feedCost, setFeedCost] = useState("");
  const [costTouched, setCostTouched] = useState(false);
  const [showDeaths, setShowDeaths] = useState(false);
  const [deaths, setDeaths] = useState("");
  const [showSample, setShowSample] = useState(false);
  const [avgWeight, setAvgWeight] = useState("");
  const [saved, setSaved] = useState(false);

  // "Remembers yesterday": prefill feed with the last logged amount for this pond.
  const lastFeedKg = useMemo(() => {
    const logs = [...(bundle?.feedLogs ?? [])].sort((a, b) => b.date.localeCompare(a.date));
    return logs[0]?.feedKg;
  }, [bundle]);

  const pricePerKgKobo = defaultFeedPriceKobo || 0;
  const autoCostKobo = feedKg ? nairaToKobo((pricePerKgKobo / 100) * Number(feedKg)) : 0;
  const effectiveCostKobo = costTouched && feedCost ? nairaToKobo(Number(feedCost)) : autoCostKobo;

  if (isLoading || !bundle) return <div className="surface h-64 animate-pulse" />;
  if (!bundle.cycle) {
    return (
      <Card className="text-center text-sm text-muted-foreground">
        This pond has no active cycle. <Link href="/ponds" className="text-primary">Stock one first.</Link>
      </Card>
    );
  }
  const cycle = bundle.cycle;
  const pond = bundle.pond;

  async function save() {
    const kg = Number(feedKg);
    if (kg > 0) {
      await addFeed.mutateAsync({
        pond,
        cycleId: cycle.id,
        date,
        feedKg: kg,
        feedCostKobo: effectiveCostKobo,
      });
    }
    if (showDeaths && Number(deaths) > 0) {
      await addMortality.mutateAsync({ pond, cycleId: cycle.id, date, count: Number(deaths) });
    }
    if (showSample && Number(avgWeight) > 0) {
      await addSample.mutateAsync({ pond, cycleId: cycle.id, date, avgWeightG: Number(avgWeight), sampleSize: 10 });
    }
    setSaved(true);
    setFeedKg("");
    setFeedCost("");
    setCostTouched(false);
    setDeaths("");
    setAvgWeight("");
    setShowDeaths(false);
    setShowSample(false);
    setTimeout(() => setSaved(false), 2200);
  }

  const busy = addFeed.isPending || addMortality.isPending || addSample.isPending;
  const canSave = Number(feedKg) > 0 || (showDeaths && Number(deaths) > 0) || (showSample && Number(avgWeight) > 0);

  return (
    <Card className="space-y-4">
      <Field label="Date" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />

      <div>
        <Field
          label="Feed given (kg)"
          value={feedKg}
          inputMode="decimal"
          autoFocus
          onChange={(e) => setFeedKg(e.target.value.replace(/[^\d.]/g, ""))}
          placeholder={lastFeedKg ? String(lastFeedKg) : "0"}
          className="!h-16 !text-3xl font-semibold tabular"
        />
        {lastFeedKg !== undefined && !feedKg && (
          <button onClick={() => setFeedKg(String(lastFeedKg))} className="mt-2 text-xs font-medium text-primary focus-ring">
            Repeat yesterday · {lastFeedKg} kg
          </button>
        )}
      </div>

      <Field
        label="Feed cost"
        prefix="₦"
        value={costTouched ? feedCost : autoCostKobo ? String(Math.round(autoCostKobo / 100)) : ""}
        inputMode="numeric"
        onChange={(e) => {
          setCostTouched(true);
          setFeedCost(e.target.value.replace(/[^\d]/g, ""));
        }}
        hint={pricePerKgKobo ? `Auto from ${formatNaira(pricePerKgKobo)}/kg — edit if it differs.` : "Set a feed price in settings to auto-fill."}
      />

      {/* Optional expanders */}
      <div className="flex flex-wrap gap-2 pt-1">
        {!showDeaths && (
          <button onClick={() => setShowDeaths(true)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground focus-ring">
            <Skull className="h-3.5 w-3.5" /> Record deaths
          </button>
        )}
        {!showSample && (
          <button onClick={() => setShowSample(true)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground focus-ring">
            <Scale className="h-3.5 w-3.5" /> Add weight sample
          </button>
        )}
      </div>

      <AnimatePresence>
        {showDeaths && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Field label="Fish lost today" value={deaths} inputMode="numeric" onChange={(e) => setDeaths(e.target.value.replace(/[^\d]/g, ""))} placeholder="0" />
          </motion.div>
        )}
        {showSample && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Field label="Average weight (g)" value={avgWeight} inputMode="numeric" onChange={(e) => setAvgWeight(e.target.value.replace(/[^\d]/g, ""))} placeholder="e.g. 450" hint="Weigh ~10 fish and average." />
          </motion.div>
        )}
      </AnimatePresence>

      <Button onClick={save} disabled={!canSave || busy} className="h-14 w-full text-base">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : saved ? <><Check className="h-5 w-5" /> Saved</> : "Save log"}
      </Button>
      <AnimatePresence>
        {saved && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-xs text-profit">
            Saved on this device ✓
          </motion.p>
        )}
      </AnimatePresence>
    </Card>
  );
}
