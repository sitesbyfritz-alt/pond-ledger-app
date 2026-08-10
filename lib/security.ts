// lib/security.ts
// App-lock PIN helpers. IMPORTANT: this is a SCREEN LOCK, not encryption — the
// IndexedDB data stays in plaintext on the device. We only store a salted hash of
// the PIN so the raw PIN is never persisted. Uses Web Crypto (available in the
// browser and in Node 20+ test environments).

/** Random per-device salt, hex-encoded. */
export function generateSalt(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Salted SHA-256 of the PIN, hex-encoded. Async (SubtleCrypto). */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time-ish comparison of a candidate PIN against a stored hash. */
export async function verifyPin(pin: string, salt: string, hash: string): Promise<boolean> {
  const candidate = await hashPin(pin, salt);
  if (candidate.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) {
    diff |= candidate.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return diff === 0;
}

/** A PIN must be 4–8 digits. */
export function isValidPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}
