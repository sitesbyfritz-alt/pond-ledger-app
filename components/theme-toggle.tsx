"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useUI } from "@/stores/ui";
import { cn } from "@/lib/utils";

/** Dark/light switch. Renders a stable placeholder until mounted to avoid
 *  a hydration mismatch (server always renders the dark-first markup). */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useUI((s) => s.theme);
  const toggleTheme = useUI((s) => s.toggleTheme);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted ? theme === "dark" : true;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full border border-border bg-secondary/60 text-muted-foreground transition hover:text-foreground focus-ring",
        className
      )}
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
