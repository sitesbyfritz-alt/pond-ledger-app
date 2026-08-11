"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command, Search, Fish, Plus, Moon, Lock, CornerDownLeft } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { useUI } from "@/stores/ui";
import { useSession } from "@/stores/session";
import { useFarm, usePonds } from "@/hooks/use-pond-data";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Action {
  id: string;
  label: string;
  hint?: string;
  group: "Go to" | "Ponds" | "Actions";
  icon: LucideIcon;
  run: () => void;
}

/** Real ⌘K command palette: fuzzy-search navigation, jump to any pond, and quick
 *  actions. Replaces the Milestone-1 stub. Keyboard-first, click-friendly, a11y. */
export function CommandPalette() {
  const open = useUI((s) => s.paletteOpen);
  const setOpen = useUI((s) => s.setPaletteOpen);
  const toggleTheme = useUI((s) => s.toggleTheme);
  const hasPin = useSession((s) => s.hasPin);
  const lock = useSession((s) => s.lock);
  const router = useRouter();

  const { data: farm } = useFarm();
  const { data: ponds } = usePonds(farm?.id);

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // ⌘K / Ctrl-K toggles from anywhere; Escape closes.
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

  // Reset query + selection each time it opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const actions = useMemo<Action[]>(() => {
    const go = (href: string) => () => {
      setOpen(false);
      router.push(href);
    };
    const list: Action[] = [
      ...NAV_ITEMS.map((n) => ({
        id: `nav:${n.href}`,
        label: n.label,
        group: "Go to" as const,
        icon: n.icon,
        run: go(n.href),
      })),
      { id: "act:log", label: "Log feeding", hint: "Daily entry", group: "Actions", icon: Plus, run: go("/log") },
      { id: "act:new-pond", label: "New pond", group: "Actions", icon: Plus, run: go("/ponds") },
      { id: "act:theme", label: "Toggle theme", hint: "Dark / light", group: "Actions", icon: Moon, run: () => { setOpen(false); toggleTheme(); } },
      ...(hasPin ? [{ id: "act:lock", label: "Lock app", group: "Actions" as const, icon: Lock, run: () => { setOpen(false); lock(); } }] : []),
      ...(ponds ?? []).map((p) => ({
        id: `pond:${p.id}`,
        label: p.name,
        group: "Ponds" as const,
        icon: Fish,
        run: go(`/ponds/${p.id}`),
      })),
    ];
    return list;
  }, [ponds, hasPin, router, setOpen, toggleTheme, lock]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) => a.label.toLowerCase().includes(q));
  }, [actions, query]);

  // Keep the active index in range as the filtered list shrinks/grows.
  useEffect(() => {
    setActive((i) => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  // Scroll the active row into view on keyboard movement.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (filtered.length ? (i + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[active]?.run();
    }
  }

  // Render with group headers, but only while there's no query (flat list when filtering).
  let lastGroup: string | null = null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 p-4 pt-[20vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={() => setOpen(false)}
    >
      <div className="surface w-full max-w-lg animate-fade-up p-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
          <Command className="h-4 w-4 text-primary" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search ponds, actions, reports…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            aria-activedescendant={filtered[active] ? `cmd-${filtered[active].id}` : undefined}
          />
          <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px]">Esc</kbd>
        </div>

        <div ref={listRef} id="command-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches for “{query}”.</p>
          )}
          {filtered.map((a, idx) => {
            const showHeader = !query && a.group !== lastGroup;
            lastGroup = a.group;
            const Icon = a.icon;
            const isActive = idx === active;
            return (
              <div key={a.id}>
                {showHeader && (
                  <p className="px-2 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground first:pt-1">
                    {a.group}
                  </p>
                )}
                <button
                  type="button"
                  id={`cmd-${a.id}`}
                  data-idx={idx}
                  role="option"
                  aria-selected={isActive}
                  onMouseMove={() => setActive(idx)}
                  onClick={a.run}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition focus-ring",
                    isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                  <span className="flex-1 truncate">{a.label}</span>
                  {a.hint && <span className="truncate text-xs text-muted-foreground">{a.hint}</span>}
                  {isActive && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
