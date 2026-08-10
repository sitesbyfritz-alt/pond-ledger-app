"use client";

// First-run wizard. Lives OUTSIDE the (app) route group so it renders without the
// shell/lock gate. Creates a profile + farm through the repository, optionally sets
// a screen-lock PIN, and marks onboarding complete.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Sparkles, PlusCircle, ShieldCheck, ArrowRight, Check } from "lucide-react";
import { repo, newRecord } from "@/lib/repository";
import { seedDemoData } from "@/lib/seed";
import { nairaToKobo } from "@/lib/format";
import { setOnboarded } from "@/lib/app-settings";
import { generateSalt, hashPin, isValidPin } from "@/lib/security";
import { useSession } from "@/stores/session";
import { Button } from "@/components/ui/button";

type Step = "path" | "profile" | "farm" | "pin" | "done";

export default function OnboardingPage() {
  const router = useRouter();
  const setLock = useSession((s) => s.setLock);
  const [step, setStep] = useState<Step>("path");
  const [busy, setBusy] = useState(false);

  // fresh-path fields
  const [name, setName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [feedPrice, setFeedPrice] = useState("1300");
  // pin fields
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  async function finish() {
    setBusy(true);
    if (pin) {
      const salt = generateSalt();
      const hash = await hashPin(pin, salt);
      setLock({ salt, hash });
    }
    setOnboarded(true);
    router.replace("/dashboard");
  }

  async function chooseDemo() {
    setBusy(true);
    await seedDemoData();
    setBusy(false);
    setStep("pin");
  }

  async function submitFarm() {
    setBusy(true);
    const profile = newRecord({ name: name.trim() || "Farmer" });
    await repo.upsertProfile(profile);
    const farm = newRecord({
      name: farmName.trim() || "My farm",
      currency: "NGN",
      defaultFeedPriceKobo: nairaToKobo(Number(feedPrice) || 0),
    });
    await repo.upsertFarm(farm);
    setBusy(false);
    setStep("pin");
  }

  function submitPin(skip: boolean) {
    if (skip) {
      setPin("");
      finish();
      return;
    }
    if (!isValidPin(pin)) {
      setPinError("PIN must be 4–8 digits.");
      return;
    }
    if (pin !== pin2) {
      setPinError("PINs don't match.");
      return;
    }
    setPinError(null);
    finish();
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_50%_-10%,hsl(var(--primary)/0.12),transparent_60%)]" />
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Droplets className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">PondLedger</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === "path" && (
              <div>
                <h1 className="font-display text-2xl font-semibold">Welcome</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Track what a kilo of fish really costs, per pond, in real time. Everything stays on
                  this device.
                </p>
                <div className="mt-6 grid gap-3">
                  <button
                    onClick={chooseDemo}
                    disabled={busy}
                    className="surface surface-hover flex items-center gap-4 p-4 text-left focus-ring disabled:opacity-60"
                  >
                    <Sparkles className="h-5 w-5 text-value" />
                    <div>
                      <p className="font-medium">Explore with demo data</p>
                      <p className="text-xs text-muted-foreground">Two sample ponds so you can see it working now.</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setStep("profile")}
                    disabled={busy}
                    className="surface surface-hover flex items-center gap-4 p-4 text-left focus-ring disabled:opacity-60"
                  >
                    <PlusCircle className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Start fresh</p>
                      <p className="text-xs text-muted-foreground">Set up your own farm from scratch.</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {step === "profile" && (
              <div>
                <h1 className="font-display text-2xl font-semibold">What&apos;s your name?</h1>
                <p className="mt-2 text-sm text-muted-foreground">So the app can greet you. You can change it later.</p>
                <Field label="Your name" value={name} onChange={setName} placeholder="e.g. Musa" autoFocus />
                <div className="mt-6 flex justify-end">
                  <Button onClick={() => setStep("farm")} disabled={!name.trim()}>
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === "farm" && (
              <div>
                <h1 className="font-display text-2xl font-semibold">Name your farm</h1>
                <p className="mt-2 text-sm text-muted-foreground">And set the feed price you usually pay.</p>
                <Field label="Farm name" value={farmName} onChange={setFarmName} placeholder="e.g. Riverside Catfish" autoFocus />
                <Field
                  label="Default feed price (₦ per kg)"
                  value={feedPrice}
                  onChange={(v) => setFeedPrice(v.replace(/[^\d]/g, ""))}
                  placeholder="1300"
                  inputMode="numeric"
                />
                <div className="mt-6 flex justify-between">
                  <Button variant="ghost" onClick={() => setStep("profile")}>Back</Button>
                  <Button onClick={submitFarm} disabled={busy || !farmName.trim()}>
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === "pin" && (
              <div>
                <div className="mb-1 flex items-center gap-2 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-xs font-medium uppercase tracking-wide">Optional</span>
                </div>
                <h1 className="font-display text-2xl font-semibold">Lock the app with a PIN?</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  A quick screen lock so others can&apos;t open your books. It&apos;s a screen lock, not
                  encryption — your data still lives unencrypted on this device.
                </p>
                <Field
                  label="PIN (4–8 digits)"
                  value={pin}
                  onChange={(v) => setPin(v.replace(/[^\d]/g, "").slice(0, 8))}
                  placeholder="••••"
                  inputMode="numeric"
                  type="password"
                  autoFocus
                />
                <Field
                  label="Confirm PIN"
                  value={pin2}
                  onChange={(v) => setPin2(v.replace(/[^\d]/g, "").slice(0, 8))}
                  placeholder="••••"
                  inputMode="numeric"
                  type="password"
                />
                {pinError && <p className="mt-2 text-xs text-loss">{pinError}</p>}
                <div className="mt-6 flex justify-between">
                  <Button variant="ghost" onClick={() => submitPin(true)} disabled={busy}>
                    Skip for now
                  </Button>
                  <Button onClick={() => submitPin(false)} disabled={busy}>
                    <Check className="h-4 w-4" /> Set PIN &amp; finish
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  type = "text",
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "numeric" | "text";
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="mt-4 block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        autoFocus={autoFocus}
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 h-12 w-full rounded-xl border border-border bg-secondary/50 px-4 text-base outline-none transition focus:border-primary focus-ring"
      />
    </label>
  );
}
