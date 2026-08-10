"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Droplets, Plus } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";

/** Desktop-only left rail. Hidden below lg (mobile uses the bottom-nav). */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border/70 bg-card/40 px-4 py-6 backdrop-blur-xl lg:flex">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Droplets className="h-5 w-5" />
        </span>
        <span className="font-display text-lg font-semibold tracking-tight">PondLedger</span>
      </Link>

      <nav className="mt-8 flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-ring",
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4.5 w-4.5 transition",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/log"
        className="mt-auto flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-ring"
      >
        <Plus className="h-4 w-4" /> Log feeding
      </Link>
    </aside>
  );
}
