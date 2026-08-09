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
    // `.tsx` er med i mønsteret slik at en komponenttest som legges ved siden
    // av komponenten faktisk PLUKKES OPP. (Å kjøre en slik test krever i
    // tillegg et DOM-miljø — det er ikke satt opp enda; glob-en er bare
    // sperren som er fjernet, ikke en invitasjon til å teste render.)
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
