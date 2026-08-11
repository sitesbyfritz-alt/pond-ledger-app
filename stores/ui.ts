// stores/ui.ts — lightweight UI state (theme, command-palette open flag).
// Persistence is manual + localStorage; the pre-paint script in app/layout.tsx
// applies the saved theme before React hydrates to avoid a flash.
import { create } from "zustand";

type Theme = "dark" | "light";

const STORAGE_KEY = "pl-theme";

function readTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* ignore */
  }
  return "dark";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

interface UIState {
  theme: Theme;
  paletteOpen: boolean;
  tourOpen: boolean;
  toggleTheme: () => void;
  setPaletteOpen: (open: boolean) => void;
  setTourOpen: (open: boolean) => void;
}

export const useUI = create<UIState>((set, get) => ({
  theme: readTheme(),
  paletteOpen: false,
  tourOpen: false,
  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    applyTheme(next);
    set({ theme: next });
  },
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setTourOpen: (tourOpen) => set({ tourOpen }),
}));
