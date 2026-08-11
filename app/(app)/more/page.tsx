"use client";

// Settings: full-database backup (export/import) and the PIN screen-lock.
// All data access goes through the repository.
import Link from "next/link";
import { useRef, useState } from "react";
import { Download, Upload, ShieldCheck, ShieldOff, AlertTriangle, Check, Package, ArrowUpRight, PlayCircle, BookOpen } from "lucide-react";
import { repo } from "@/lib/repository";
import { generateSalt, hashPin, isValidPin } from "@/lib/security";
import { getLockConfig } from "@/lib/app-settings";
import { verifyPin } from "@/lib/security";
import { useSession } from "@/stores/session";
import { useUI } from "@/stores/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function MorePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your data lives on this device. Back it up.</p>
      </div>
      <Link href="/feed" className="surface surface-hover flex items-center justify-between p-5 focus-ring">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Feed &amp; market</p>
            <p className="text-xs text-muted-foreground">Feed stock and today&apos;s market price.</p>
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
      </Link>
      <HelpSection />
      <BackupSection />
      <SecuritySection />
    </div>
  );
}

function HelpSection() {
  const setTourOpen = useUI((s) => s.setTourOpen);
  return (
    <Card>
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm font-semibold">Guide &amp; app tour</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        New here, or want a refresher? Take the quick walkthrough, or open the full guide.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => setTourOpen(true)}>
          <PlayCircle className="h-4 w-4" /> Replay the tour
        </Button>
        <a href="/manual.html" target="_blank" rel="noopener noreferrer">
          <Button variant="outline">
            <BookOpen className="h-4 w-4" /> Open user guide
          </Button>
        </a>
      </div>
    </Card>
  );
}

function BackupSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [pending, setPending] = useState<File | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function doExport() {
    setBusy(true);
    try {
      const json = await repo.exportBackup();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pondledger-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ kind: "ok", text: "Backup downloaded." });
    } catch (e) {
      setStatus({ kind: "err", text: `Export failed: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  async function doImport() {
    if (!pending) return;
    setBusy(true);
    try {
      const text = await pending.text();
      await repo.importBackup(text, mode);
      setStatus({ kind: "ok", text: "Backup restored. Reloading…" });
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setStatus({ kind: "err", text: `Import failed: ${(e as Error).message}` });
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Download className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm font-semibold">Backup &amp; restore</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Export a full JSON backup, or restore one on a new device.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={doExport} disabled={busy}>
          <Download className="h-4 w-4" /> Export backup
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Upload className="h-4 w-4" /> Choose file to import
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            setPending(e.target.files?.[0] ?? null);
            setStatus(null);
          }}
        />
      </div>

      {pending && (
        <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4">
          <p className="text-sm font-medium">{pending.name}</p>
          <div className="mt-3 flex flex-col gap-2">
            <ModeRadio value="merge" mode={mode} setMode={setMode} label="Merge" hint="Add/overwrite records; keep everything else." />
            <ModeRadio value="replace" mode={mode} setMode={setMode} label="Replace all" hint="Wipe this device's data first, then import." />
          </div>
          {mode === "replace" && (
            <p className="mt-3 flex items-center gap-2 text-xs text-warning">
              <AlertTriangle className="h-3.5 w-3.5" /> This erases current data on this device.
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <Button onClick={doImport} disabled={busy}>
              {mode === "replace" ? "Replace & import" : "Merge & import"}
            </Button>
            <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {status && (
        <p className={`mt-3 text-xs ${status.kind === "ok" ? "text-profit" : "text-loss"}`}>{status.text}</p>
      )}
    </Card>
  );
}

function ModeRadio({
  value,
  mode,
  setMode,
  label,
  hint,
}: {
  value: "merge" | "replace";
  mode: string;
  setMode: (m: "merge" | "replace") => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="radio"
        name="import-mode"
        checked={mode === value}
        onChange={() => setMode(value)}
        className="mt-1 accent-[hsl(var(--primary))]"
      />
      <span>
        <span className="text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}

function SecuritySection() {
  const hasPin = useSession((s) => s.hasPin);
  const setLock = useSession((s) => s.setLock);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [current, setCurrent] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function addPin() {
    if (!isValidPin(pin)) return setMsg({ kind: "err", text: "PIN must be 4–8 digits." });
    if (pin !== pin2) return setMsg({ kind: "err", text: "PINs don't match." });
    setBusy(true);
    const salt = generateSalt();
    const hash = await hashPin(pin, salt);
    setLock({ salt, hash });
    setBusy(false);
    setPin("");
    setPin2("");
    setMsg({ kind: "ok", text: "PIN lock enabled." });
  }

  async function removePin() {
    setBusy(true);
    const cfg = getLockConfig();
    const ok = cfg ? await verifyPin(current, cfg.salt, cfg.hash) : false;
    setBusy(false);
    if (!ok) return setMsg({ kind: "err", text: "Current PIN is incorrect." });
    setLock(null);
    setCurrent("");
    setMsg({ kind: "ok", text: "PIN lock removed." });
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        {hasPin ? <ShieldCheck className="h-4 w-4 text-profit" /> : <ShieldOff className="h-4 w-4 text-muted-foreground" />}
        <h2 className="font-display text-sm font-semibold">App lock</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        A PIN screen-lock for this device. It&apos;s a screen lock, not encryption — data stays
        unencrypted in the browser&apos;s storage.
      </p>

      {hasPin ? (
        <div className="mt-4 max-w-xs">
          <PinInput label="Current PIN" value={current} onChange={setCurrent} />
          <Button variant="outline" className="mt-3" onClick={removePin} disabled={busy}>
            <ShieldOff className="h-4 w-4" /> Remove lock
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">To change it, remove the lock and set a new PIN.</p>
        </div>
      ) : (
        <div className="mt-4 max-w-xs">
          <PinInput label="New PIN (4–8 digits)" value={pin} onChange={setPin} />
          <PinInput label="Confirm PIN" value={pin2} onChange={setPin2} />
          <Button className="mt-3" onClick={addPin} disabled={busy}>
            <Check className="h-4 w-4" /> Enable lock
          </Button>
        </div>
      )}

      {msg && <p className={`mt-3 text-xs ${msg.kind === "ok" ? "text-profit" : "text-loss"}`}>{msg.text}</p>}
    </Card>
  );
}

function PinInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="mt-3 block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="password"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, "").slice(0, 8))}
        placeholder="••••"
        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-secondary/50 px-4 outline-none transition focus:border-primary focus-ring"
      />
    </label>
  );
}
