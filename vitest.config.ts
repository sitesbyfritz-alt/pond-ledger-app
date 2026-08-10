import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node", // calc engine is pure; no DOM needed
    include: ["lib/**/*.test.ts"],
  },
});
