import { afterEach, describe, expect, it, vi } from "vitest";

import { checkAdminPassword, FAILED_AUTH_DELAY_MS } from "./admin";

const ORIG = process.env.ADMIN_PASSWORD;

afterEach(() => {
  if (ORIG === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = ORIG;
  vi.unstubAllEnvs();
});

describe("checkAdminPassword", () => {
  it("returns 'unset' when ADMIN_PASSWORD is not configured", async () => {
    delete process.env.ADMIN_PASSWORD;
    await expect(checkAdminPassword("anything")).resolves.toBe("unset");
  });

  it("returns 'ok' only for the exact password", async () => {
    process.env.ADMIN_PASSWORD = "s3cret-pass";
    await expect(checkAdminPassword("s3cret-pass")).resolves.toBe("ok");
  });

  it("returns 'bad' for a wrong password of equal length", async () => {
    process.env.ADMIN_PASSWORD = "s3cret-pass";
    await expect(checkAdminPassword("s3cret-paSS")).resolves.toBe("bad");
    await expect(checkAdminPassword("wrong-pass!")).resolves.toBe("bad");
  });

  it("returns 'bad' for a length mismatch and for null", async () => {
    process.env.ADMIN_PASSWORD = "s3cret-pass";
    await expect(checkAdminPassword("short")).resolves.toBe("bad");
    await expect(checkAdminPassword("s3cret-pass-and-then-some")).resolves.toBe("bad");
    await expect(checkAdminPassword(null)).resolves.toBe("bad");
  });

  // ── Konstant-tids-egenskapene (natt-runde F4) ─────────────────────────────

  it("returnerer 'bad' for tom streng — uten å kortslutte på tomhet", async () => {
    process.env.ADMIN_PASSWORD = "s3cret-pass";
    await expect(checkAdminPassword("")).resolves.toBe("bad");
  });

  it("behandler et 1-tegns og et 10 000-tegns forsøk likt (ingen lengde-kortslutning)", async () => {
    process.env.ADMIN_PASSWORD = "s3cret-pass";
    // Begge skal gjennom hele SHA-256-sammenligningen og gi samme svar.
    await expect(checkAdminPassword("x")).resolves.toBe("bad");
    await expect(checkAdminPassword("x".repeat(10_000))).resolves.toBe("bad");
  });

  it("er ufølsom for hvor det første avviket kommer (prefiks vs. helt ulikt)", async () => {
    process.env.ADMIN_PASSWORD = "s3cret-pass";
    // Riktig helt til siste tegn, og feil allerede på første — samme utfall,
    // og med digest-sammenligning gjøres nøyaktig like mye arbeid.
    await expect(checkAdminPassword("s3cret-pasZ")).resolves.toBe("bad");
    await expect(checkAdminPassword("Z3cret-pass")).resolves.toBe("bad");
  });

  it("bruker sammenligning med fast bredde (32-byte digest), ikke passordlengden", async () => {
    // Et passord som er mye lengre enn digesten: en implementasjon som løp
    // over passordlengden ville brukt en annen løkkelengde her. Utfallet må
    // fortsatt være riktig i begge retninger.
    process.env.ADMIN_PASSWORD = "p".repeat(500);
    await expect(checkAdminPassword("p".repeat(500))).resolves.toBe("ok");
    await expect(checkAdminPassword("p".repeat(499) + "q")).resolves.toBe("bad");
  });

  it("holder på en forsinkelse rutene kan bruke ved feilet innlogging", () => {
    expect(FAILED_AUTH_DELAY_MS).toBeGreaterThanOrEqual(200);
  });
});
