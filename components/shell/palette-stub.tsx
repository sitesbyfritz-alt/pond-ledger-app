"use client";

import { useEffect } from "react";
import { Command } from "lucide-react";
import { useUI } from "@/stores/ui";

/** Milestone 1 placeholder for the ⌘K command palette: real search/actions land
 *  later. Wires the ⌘K / Ctrl-K shortcut now so the muscle memory works. */
export function PaletteStub() {
  const open = useUI((s) => s.paletteOpen);
  const setOpen = useUI((s) => s.setPaletteOpen);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useUI.getState().paletteOpen);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 p-4 pt-[20vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={() => setOpen(false)}
    >
      <div
        className="surface w-full max-w-lg animate-fade-up p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
          <Command className="h-4 w-4 text-primary" />
          <input
            autoFocus
            disabled
            placeholder="Search ponds, actions, reports…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px]">Esc</kbd>
        </div>
        <div className="p-6 text-center text-sm text-muted-foreground">
          The command palette arrives with the core loop.
          <br />
          For now, use the sidebar to move around.
        </div>
      </div>
    </div>
  );
}
