// stores/session.ts — runtime lock state for the PIN screen-lock.
// `locked` starts true whenever a lock is configured; unlocking holds for the
// life of the tab (not persisted), so a page refresh re-locks.
import { create } from "zustand";
import { hasLock, getLockConfig, setLockConfig, type LockConfig } from "@/lib/app-settings";
import { verifyPin } from "@/lib/security";

interface SessionState {
  /** true = the lock screen should be shown */
  locked: boolean;
  hasPin: boolean;
  /** Re-read config from storage (after onboarding or settings changes). */
  refresh: () => void;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
  /** Persist a new lock config and mark unlocked. Pass null to remove the lock. */
  setLock: (config: LockConfig | null) => void;
}

export const useSession = create<SessionState>((set) => ({
  locked: hasLock(),
  hasPin: hasLock(),
  refresh: () => {
    const has = hasLock();
    set((s) => ({ hasPin: has, locked: has ? s.locked : false }));
  },
  unlock: async (pin) => {
    const cfg = getLockConfig();
    if (!cfg) {
      set({ locked: false });
      return true;
    }
    const ok = await verifyPin(pin, cfg.salt, cfg.hash);
    if (ok) set({ locked: false });
    return ok;
  },
  lock: () => set((s) => (s.hasPin ? { locked: true } : s)),
  setLock: (config) => {
    setLockConfig(config);
    set({ hasPin: config !== null, locked: false });
  },
}));
