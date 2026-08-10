import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node", // calc engine is pure; no DOM needed
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
  },
  resolve: {
    // Mirrors tsconfig.json's "@/*" -> "./*" path mapping for route tests
    // (app/**) that import via the @/ alias.
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
