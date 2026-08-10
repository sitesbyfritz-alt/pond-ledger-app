"use client";

import { Command, Droplets, Lock, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useUI } from "@/stores/ui";
import { useSession } from "@/stores/session";

/** Sticky top bar. Farm identity on mobile, ⌘K stub + theme toggle everywhere.
 *  The command palette is a styled stub in Milestone 1 (real palette later). */
export function Topbar({ farmName }: { farmName?: string }) {
  const setPaletteOpen = useUI((s) => s.setPaletteOpen);
  const hasPin = useSession((s) => s.hasPin);
  const lock = useSession((s) => s.lock);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border/70 bg-background/70 px-4 backdrop-blur-xl lg:px-8">
      {/* Mobile brand (sidebar carries it on desktop) */}
      <div className="flex items-center gap-2 lg:hidden">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Droplets className="h-4 w-4" />
        </span>
        <span className="font-display text-base font-semibold">PondLedger</span>
      </div>

      <div className="hidden lg:block">
        <p className="text-sm font-medium">{farmName ?? "Your farm"}</p>
        <p className="text-xs text-muted-foreground">Local-first · saved on this device</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="hidden items-center gap-2 rounded-full border border-border bg-secondary/60 py-1.5 pl-3 pr-2 text-xs text-muted-foreground transition hover:text-foreground focus-ring sm:flex"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search</span>
          <kbd className="ml-2 inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>
        {hasPin && (
          <button
            type="button"
            onClick={lock}
            aria-label="Lock app"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-secondary/60 text-muted-foreground transition hover:text-foreground focus-ring"
          >
            <Lock className="h-4 w-4" />
          </button>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
