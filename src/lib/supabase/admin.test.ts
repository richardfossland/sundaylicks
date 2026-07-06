import { afterEach, describe, expect, it, vi } from "vitest";

import { checkAdminPassword } from "./admin";

const ORIG = process.env.ADMIN_PASSWORD;

afterEach(() => {
  if (ORIG === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = ORIG;
  vi.unstubAllEnvs();
});

describe("checkAdminPassword", () => {
  it("returns 'unset' when ADMIN_PASSWORD is not configured", () => {
    delete process.env.ADMIN_PASSWORD;
    expect(checkAdminPassword("anything")).toBe("unset");
  });

  it("returns 'ok' only for the exact password", () => {
    process.env.ADMIN_PASSWORD = "s3cret-pass";
    expect(checkAdminPassword("s3cret-pass")).toBe("ok");
  });

  it("returns 'bad' for a wrong password of equal length", () => {
    process.env.ADMIN_PASSWORD = "s3cret-pass";
    expect(checkAdminPassword("s3cret-paSS".slice(0, "s3cret-pass".length))).toBe("bad");
    expect(checkAdminPassword("wrong-pass!")).toBe("bad");
  });

  it("returns 'bad' for a length mismatch and for null", () => {
    process.env.ADMIN_PASSWORD = "s3cret-pass";
    expect(checkAdminPassword("short")).toBe("bad");
    expect(checkAdminPassword("s3cret-pass-and-then-some")).toBe("bad");
    expect(checkAdminPassword(null)).toBe("bad");
  });
});
