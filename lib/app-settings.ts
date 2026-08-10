// lib/app-settings.ts
// Device-local app settings kept OUT of the synced data set: onboarding flag and
// the PIN screen-lock (salt + hash). Stored in localStorage so adding a lock never
// touches the Dexie schema or risks user data. All access is guarded for SSR.

export interface LockConfig {
  salt: string;
  hash: string;
}

const KEYS = {
  onboarded: "pl-onboarded",
  lock: "pl-lock",
} as const;

function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function isOnboarded(): boolean {
  return read(KEYS.onboarded) === "1";
}
export function setOnboarded(done: boolean): void {
  write(KEYS.onboarded, done ? "1" : null);
}

export function getLockConfig(): LockConfig | null {
  const raw = read(KEYS.lock);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LockConfig;
    if (parsed?.salt && parsed?.hash) return parsed;
  } catch {
    /* corrupt -> treat as no lock */
  }
  return null;
}
export function setLockConfig(config: LockConfig | null): void {
  write(KEYS.lock, config ? JSON.stringify(config) : null);
}
export function hasLock(): boolean {
  return getLockConfig() !== null;
}
