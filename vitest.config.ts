import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Node-env unit tests for the pure logic + security-critical validation. The
// `@/*` alias mirrors tsconfig so tests import app modules the same way.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
