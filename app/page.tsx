import Link from "next/link";
import { Fish, TrendingUp, WifiOff } from "lucide-react";

// Minimal runnable landing so `npm run dev` works out of the box.
// Milestone 1 replaces this with the real bento-grid dashboard.
export default function Home() {
  return (
    <main className="container flex min-h-dvh flex-col items-center justify-center py-16 text-center">
      <div className="animate-fade-up">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
          <Fish className="h-3.5 w-3.5 text-primary" />
          PondLedger
        </span>

        <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Know what a kilo of fish is
          <br />
          <span className="text-primary">costing you</span> — in real time.
        </h1>

        <p className="mx-auto mt-4 max-w-md text-balance text-muted-foreground">
          A local-first feed & profit tracker for catfish farmers. Works offline, on your phone,
          in under 30 seconds a day.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Open dashboard
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <WifiOff className="h-3.5 w-3.5" /> No internet required
          </span>
        </div>

        <div className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: TrendingUp, label: "Live FCR & cost/kg" },
            { icon: Fish, label: "Multi-pond tracking" },
            { icon: WifiOff, label: "Offline-first PWA" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="surface p-5 text-left">
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm font-medium">{label}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Scaffold ready. See <code className="text-foreground">PondLedger_ClaudeCode_BuildPrompt.md</code>{" "}
          and build from Milestone 1.
        </p>
      </div>
    </main>
  );
}
