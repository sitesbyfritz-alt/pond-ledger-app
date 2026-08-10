"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, Plus, TrendingUp } from "lucide-react";
import { useFarm, useFeedItems, useUpsertFeedItem, useMarketPrice, useSetMarketPrice } from "@/hooks/use-pond-data";
import { newRecord } from "@/lib/repository";
import type { FeedItem } from "@/lib/types";
import { formatNaira, formatNairaPerKg, formatKg, nairaToKobo } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

const today = () => new Date().toISOString().slice(0, 10);

export default function FeedInventoryPage() {
  const { data: farm } = useFarm();
  const { data: items } = useFeedItems(farm?.id);

  return (
    <div className="space-y-6">
      <Link href="/more" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground focus-ring">
        <ArrowLeft className="h-4 w-4" /> Settings
      </Link>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Feed &amp; market</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track feed stock and today&apos;s market price.</p>
      </div>

      {farm && <MarketPriceCard farmId={farm.id} />}
      {farm && <FeedItemsCard farmId={farm.id} items={items ?? []} />}
    </div>
  );
}

function MarketPriceCard({ farmId }: { farmId: string }) {
  const { data: market } = useMarketPrice(farmId);
  const set = useSetMarketPrice(farmId);
  const [price, setPrice] = useState("");

  async function save() {
    if (!(Number(price) > 0)) return;
    await set.mutateAsync({ date: today(), pricePerKgKobo: nairaToKobo(Number(price)), source: "manual" });
    setPrice("");
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-value" />
        <h2 className="font-display text-sm font-semibold">Market price</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Current: {market ? `${formatNairaPerKg(market.pricePerKgKobo)} (set ${market.date})` : "not set yet"}
      </p>
      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <Field label="Update price / kg" prefix="₦" value={price} inputMode="numeric" onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))} placeholder="e.g. 3000" />
        </div>
        <Button onClick={save} disabled={!(Number(price) > 0) || set.isPending}>Save</Button>
      </div>
    </Card>
  );
}

function FeedItemsCard({ farmId, items }: { farmId: string; items: FeedItem[] }) {
  const upsert = useUpsertFeedItem(farmId);
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  async function submit() {
    if (!brand.trim()) return;
    const item = newRecord({
      farmId,
      brand: brand.trim(),
      unit: "kg",
      pricePerKgKobo: nairaToKobo(Number(price) || 0),
      stockKg: Number(stock) || 0,
    }) as FeedItem;
    await upsert.mutateAsync(item);
    setBrand("");
    setPrice("");
    setStock("");
    setOpen(false);
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold">Feed stock</h2>
        </div>
        {!open && (
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary focus-ring">
            <Plus className="h-3.5 w-3.5" /> Add feed
          </button>
        )}
      </div>

      {items.length > 0 ? (
        <ul className="mt-3 flex flex-col divide-y divide-border/60">
          {items.map((f) => (
            <li key={f.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium">{f.brand}</p>
                <p className="text-xs text-muted-foreground">{formatNairaPerKg(f.pricePerKgKobo)}</p>
              </div>
              <span className="text-sm tabular">{formatKg(f.stockKg)} in stock</span>
            </li>
          ))}
        </ul>
      ) : (
        !open && <p className="mt-3 text-sm text-muted-foreground">No feed items yet.</p>
      )}

      {open && (
        <div className="mt-3 rounded-xl bg-secondary/40 p-3">
          <Field label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Coppens 4mm" autoFocus />
          <Field label="Price / kg" prefix="₦" value={price} inputMode="numeric" onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))} />
          <Field label="Stock (kg)" value={stock} inputMode="decimal" onChange={(e) => setStock(e.target.value.replace(/[^\d.]/g, ""))} />
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={submit} disabled={!brand.trim() || upsert.isPending}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
