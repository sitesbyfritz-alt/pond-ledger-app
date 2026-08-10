import { describe, it, expect } from "vitest";
import { generateSalt, hashPin, verifyPin, isValidPin } from "./security";

describe("security / PIN", () => {
  it("validates PIN format", () => {
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("12345678")).toBe(true);
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("123456789")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
  });

  it("hashes deterministically for the same salt", async () => {
    const salt = "abc123";
    const a = await hashPin("2468", salt);
    const b = await hashPin("2468", salt);
    expect(a).toBe(b);
    expect(a).toHaveLength(64); // SHA-256 hex
  });

  it("produces different hashes for different salts", async () => {
    const a = await hashPin("2468", "salt-one");
    const b = await hashPin("2468", "salt-two");
    expect(a).not.toBe(b);
  });

  it("verifies the correct PIN and rejects wrong ones", async () => {
    const salt = generateSalt();
    const hash = await hashPin("1357", salt);
    expect(await verifyPin("1357", salt, hash)).toBe(true);
    expect(await verifyPin("1358", salt, hash)).toBe(false);
  });

  it("generates unique salts", () => {
    expect(generateSalt()).not.toBe(generateSalt());
  });
});
