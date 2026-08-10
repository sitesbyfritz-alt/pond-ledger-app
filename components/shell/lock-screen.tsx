"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Delete } from "lucide-react";
import { useSession } from "@/stores/session";

/** Full-screen numeric PIN pad shown when the app is locked. */
export function LockScreen() {
  const unlock = useSession((s) => s.unlock);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(next: string) {
    setBusy(true);
    const ok = await unlock(next);
    setBusy(false);
    if (!ok) {
      setError(true);
      setTimeout(() => setError(false), 600);
      setPin("");
    }
  }

  function press(d: string) {
    if (busy) return;
    const next = (pin + d).slice(0, 8);
    setPin(next);
    if (next.length >= 4) {
      // auto-submit at 4; if wrong and they meant a longer PIN, they can keep typing
      void submit(next);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background px-6">
      <div className="w-full max-w-xs text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Lock className="h-6 w-6" />
        </span>
        <h1 className="mt-5 font-display text-xl font-semibold">Enter your PIN</h1>
        <p className="mt-1 text-sm text-muted-foreground">PondLedger is locked on this device.</p>

        <motion.div
          animate={error ? { x: [0, -8, 8, -6, 6, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="mt-6 flex justify-center gap-3"
        >
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full border ${
                i < pin.length ? "border-primary bg-primary" : "border-border"
              } ${error ? "border-loss" : ""}`}
            />
          ))}
        </motion.div>

        <div className="mt-8 grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <PadButton key={d} onClick={() => press(d)}>{d}</PadButton>
          ))}
          <div />
          <PadButton onClick={() => press("0")}>0</PadButton>
          <PadButton onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Delete">
            <Delete className="h-5 w-5" />
          </PadButton>
        </div>
      </div>
    </div>
  );
}

function PadButton({
  children,
  onClick,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-border bg-secondary/50 text-xl font-medium transition active:scale-95 hover:bg-secondary focus-ring"
      {...rest}
    >
      {children}
    </button>
  );
}
