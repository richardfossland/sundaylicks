import { describe, expect, it } from "vitest";

import { submissionSchema, seedLickSchema, lickContent } from "./validation";

// A minimal valid lick used as the base for each case.
const base = {
  name: "Test lick",
  description: null,
  category: "run" as const,
  genre: "gospel" as const,
  difficulty: 2 as const,
  original_key: 0,
  default_bpm: 120,
  beats: 4,
  time_signature: "4/4",
  notes: [{ p: 60, t: 0, d: 1, h: "R" as const }],
  chords: [{ t: 0, d: 4, r: 0, q: "maj7" }],
  tags: ["intro"],
};

describe("submissionSchema — musical validity", () => {
  it("accepts a well-formed lick", () => {
    expect(submissionSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a pitch outside 21–108", () => {
    expect(
      submissionSchema.safeParse({ ...base, notes: [{ p: 200, t: 0, d: 1, h: "R" }] }).success,
    ).toBe(false);
    expect(
      submissionSchema.safeParse({ ...base, notes: [{ p: 5, t: 0, d: 1, h: "R" }] }).success,
    ).toBe(false);
  });

  it("rejects a note that runs past `beats` (superRefine)", () => {
    const r = submissionSchema.safeParse({
      ...base,
      beats: 4,
      notes: [{ p: 60, t: 3, d: 2, h: "R" }], // 3 + 2 = 5 > 4
    });
    expect(r.success).toBe(false);
  });

  it("rejects a name over 80 chars and an empty name", () => {
    expect(submissionSchema.safeParse({ ...base, name: "x".repeat(81) }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...base, name: "" }).success).toBe(false);
  });

  it("rejects an unknown category / genre", () => {
    expect(submissionSchema.safeParse({ ...base, category: "nope" }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...base, genre: "polka" }).success).toBe(false);
  });
});

describe("submissionSchema — abuse / size bounds", () => {
  it("rejects more than 512 notes", () => {
    const notes = Array.from({ length: 513 }, () => ({ p: 60, t: 0, d: 0.1, h: "R" as const }));
    expect(submissionSchema.safeParse({ ...base, notes }).success).toBe(false);
  });

  it("rejects more than 64 chords", () => {
    const chords = Array.from({ length: 65 }, () => ({ t: 0, d: 0.1, r: 0, q: "m7" }));
    expect(submissionSchema.safeParse({ ...base, chords }).success).toBe(false);
  });

  it("rejects an over-long chord quality string", () => {
    expect(
      submissionSchema.safeParse({ ...base, chords: [{ t: 0, d: 4, r: 0, q: "x".repeat(13) }] })
        .success,
    ).toBe(false);
  });

  it("rejects an absurd `beats` value (giant-SVG guard)", () => {
    expect(submissionSchema.safeParse({ ...base, beats: 1_000_000 }).success).toBe(false);
  });

  it("rejects too many tags and over-long tags", () => {
    expect(
      submissionSchema.safeParse({ ...base, tags: Array.from({ length: 33 }, () => "t") }).success,
    ).toBe(false);
    expect(submissionSchema.safeParse({ ...base, tags: ["x".repeat(41)] }).success).toBe(false);
  });
});

describe("lickContent — server-controlled fields are not part of the contract", () => {
  it("strips client-supplied status/slug/id/submitted_by (forge resistance)", () => {
    const parsed = lickContent.parse({
      ...base,
      status: "published",
      slug: "evil-slug",
      id: "00000000-0000-0000-0000-000000000000",
      submitted_by: "admin",
      approved: true,
    } as Record<string, unknown>);
    expect("status" in parsed).toBe(false);
    expect("slug" in parsed).toBe(false);
    expect("id" in parsed).toBe(false);
    expect("submitted_by" in parsed).toBe(false);
    expect("approved" in parsed).toBe(false);
  });
});

describe("seedLickSchema", () => {
  it("requires a kebab-case slug", () => {
    expect(seedLickSchema.safeParse({ ...base, slug: "good-slug-1" }).success).toBe(true);
    expect(seedLickSchema.safeParse({ ...base, slug: "Bad Slug" }).success).toBe(false);
  });
});
