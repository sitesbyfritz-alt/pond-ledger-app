"use client";

// First-run feature walkthrough. A full-screen carousel that greets the farmer
// the first time they land in the app after onboarding, explaining every screen
// in plain language. Robust by design: it is NOT anchored to page elements (which
// break across the responsive sidebar/bottom-nav layouts) — it stands on its own,
// so it renders the same on any device and any starting route.
//
// Auto-opens once (guarded by the `pl-tour` localStorage flag); afterwards the
// farmer can replay it from Settings via the shared `tourOpen` UI-store flag.
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Droplets,
  LayoutDashboard,
  Plus,
  Fish,
  LineChart,
  Sparkles,
  Package,
  ShieldCheck,
  WifiOff,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { hasSeenTour, setTourSeen } from "@/lib/app-settings";
import { useUI } from "@/stores/ui";
import { Button } from "@/components/ui/button";

interface TourStep {
  icon: LucideIcon;
  tone: string; // tailwind text-color class for the icon
  title: string;
  body: string;
  tip?: string;
}

const STEPS: TourStep[] = [
  {
    icon: Droplets,
    tone: "text-primary",
    title: "Welcome to PondLedger",
    body: "This app tells you one thing clearly: what a kilo of fish is costing you in each pond, right now. Log your feeding every day and PondLedger does the maths for you.",
    tip: "Everything stays on this phone. No internet needed, no account, no one else can see your books.",
  },
  {
    icon: LayoutDashboard,
    tone: "text-primary",
    title: "Dashboard — your farm at a glance",
    body: "The home screen shows the big numbers for the whole farm: your blended cost per kilo (your break-even), total fish weight, cash tied up in feed, and how you sit against today's market price.",
    tip: "Green means you're above the market price and making money. Red means a kilo is costing you more than it sells for.",
  },
  {
    icon: Plus,
    tone: "text-value",
    title: "The daily log — under 30 seconds",
    body: "Tap the round + button (bottom of the screen) any time to log today's feeding. Type how many kilos of feed you gave, and the cost fills in for you. That's it — tap Save.",
    tip: "Tap “Repeat yesterday” to reuse the same amount in one touch. You can also record fish deaths or a weight sample from the same screen.",
  },
  {
    icon: Fish,
    tone: "text-primary",
    title: "Ponds — one story per pond",
    body: "Open Ponds to add a pond and stock a batch (how many fingerlings, what they cost, your target weight). Each pond then keeps its own running cost, feed-to-flesh ratio (FCR), and how many fish are surviving.",
    tip: "Weigh about 10 fish now and then and add a weight sample. That's what unlocks your live cost per kilo.",
  },
  {
    icon: LineChart,
    tone: "text-primary",
    title: "Analytics — see the trend",
    body: "Analytics shows how your cost per kilo is falling as the fish grow into their feed, your break-even line, and a profit view. It helps you decide the best time to harvest.",
    tip: "Your cost per kilo should drop over a cycle. If it climbs, feeding or deaths need a look.",
  },
  {
    icon: Sparkles,
    tone: "text-value",
    title: "Plain-language AI summary (optional)",
    body: "On Analytics you can tap “Generate summary” to get a short, plain-English read on how your ponds are doing. It's completely optional and off until you turn it on.",
    tip: "Only farm totals are sent for the summary — never your name unless you choose to include it.",
  },
  {
    icon: Package,
    tone: "text-primary",
    title: "Feed & market price",
    body: "In Settings ▸ Feed & market you set the feed price you pay and today's selling price per kilo. Those two numbers are what make your cost and profit figures real.",
    tip: "Update the market price whenever it changes so “margin vs market” stays honest.",
  },
  {
    icon: ShieldCheck,
    tone: "text-profit",
    title: "Back up your records & lock the app",
    body: "Your records live on this phone only. In Settings, tap “Export backup” to save a file you can keep safe or move to a new phone. You can also set a PIN so only you can open your books.",
    tip: "Back up often — if you lose or reset the phone without a backup, the records are gone.",
  },
  {
    icon: WifiOff,
    tone: "text-primary",
    title: "Works offline — install it",
    body: "PondLedger runs with no network, right at the pond side. From your browser menu choose “Add to Home screen” to open it like a normal app.",
    tip: "You can reopen this tour any time from Settings, and there's a full guide there too.",
  },
];

export function WelcomeTour() {
  const tourOpen = useUI((s) => s.tourOpen);
  const setTourOpen = useUI((s) => s.setTourOpen);
  const [index, setIndex] = useState(0);

  // Auto-open once on first run (after onboarding). Runs client-side only, so the
  // localStorage read is safe.
  useEffect(() => {
    if (!hasSeenTour()) setTourOpen(true);
  }, [setTourOpen]);

  // Always start from the first slide whenever the tour opens (incl. replays).
  useEffect(() => {
    if (tourOpen) setIndex(0);
  }, [tourOpen]);

  const close = useCallback(() => {
    setTourSeen(true);
    setTourOpen(false);
  }, [setTourOpen]);

  const isLast = index === STEPS.length - 1;
  const next = useCallback(() => (isLast ? close() : setIndex((i) => i + 1)), [isLast, close]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Keyboard: Esc closes, arrows move.
  useEffect(() => {
    if (!tourOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tourOpen, close, next, back]);

  if (!tourOpen) return null;

  const step = STEPS[index];
  const Icon = step.icon;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
      >
        <motion.div
          className="surface relative w-full max-w-md overflow-hidden rounded-t-2xl p-6 shadow-2xl sm:rounded-2xl sm:p-7"
          initial={{ y: 24, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="pointer-events-none absolute inset-x-0 -top-24 h-40 bg-[radial-gradient(24rem_12rem_at_50%_0%,hsl(var(--primary)/0.18),transparent_70%)]" />

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Step {index + 1} of {STEPS.length}
            </span>
            <button
              onClick={close}
              aria-label="Skip tour"
              className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className={`mt-5 inline-grid h-14 w-14 place-items-center rounded-2xl bg-secondary ${step.tone}`}>
                <Icon className="h-7 w-7" />
              </span>
              <h2 id="tour-title" className="mt-5 font-display text-xl font-semibold tracking-tight">
                {step.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              {step.tip && (
                <p className="mt-4 rounded-xl border border-border bg-secondary/50 p-3 text-xs leading-relaxed text-foreground/90">
                  <span className="font-semibold text-value">Tip · </span>
                  {step.tip}
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="mt-6 flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to step ${i + 1}`}
                className={`h-1.5 rounded-full transition-all focus-ring ${
                  i === index ? "w-5 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground"
                }`}
              />
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            {index > 0 ? (
              <Button variant="ghost" onClick={back}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={close}>
                Skip
              </Button>
            )}
            <Button onClick={next}>
              {isLast ? (
                <>
                  <Check className="h-4 w-4" /> Start using PondLedger
                </>
              ) : (
                <>
                  Next <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {isLast && (
            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              Full guide any time in Settings
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
