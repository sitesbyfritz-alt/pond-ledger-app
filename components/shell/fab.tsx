"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

/** Mobile daily-log FAB, floated into the center notch of the bottom-nav. */
export function Fab() {
  return (
    <Link
      href="/log"
      aria-label="Log feeding"
      className="grid h-14 w-14 -translate-y-4 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 ring-4 ring-background transition active:scale-95 focus-ring"
    >
      <Plus className="h-6 w-6" />
    </Link>
  );
}
