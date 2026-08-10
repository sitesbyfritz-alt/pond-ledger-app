// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { getAiConsent, setAiConsent } from "./app-settings";

beforeEach(() => localStorage.clear());

describe("aiConsent", () => {
  it("defaults to unset", () => {
    expect(getAiConsent()).toBe("unset");
  });

  it("persists a chosen value", () => {
    setAiConsent("anonymous");
    expect(getAiConsent()).toBe("anonymous");
  });

  it("treats a corrupt value as unset", () => {
    localStorage.setItem("pl-ai-consent", "garbage");
    expect(getAiConsent()).toBe("unset");
  });
});
