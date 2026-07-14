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

describe("theory metadata — mode / harmonic_function / kind (0004_theory_metadata)", () => {
  it("validates a lick with none of the new fields (backward compat) and fills defaults", () => {
    const r = submissionSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.mode).toBe("major");
      expect(r.data.harmonic_function).toEqual([]);
      expect(r.data.kind).toBe("lick");
    }
  });

  it("validates a lick that supplies all three new fields", () => {
    const r = submissionSchema.safeParse({
      ...base,
      mode: "minor",
      harmonic_function: ["ii", "V7"],
      kind: "transition",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.mode).toBe("minor");
      expect(r.data.harmonic_function).toEqual(["ii", "V7"]);
      expect(r.data.kind).toBe("transition");
    }
  });

  it("rejects an unknown mode", () => {
    expect(submissionSchema.safeParse({ ...base, mode: "dorian" }).success).toBe(false);
  });

  it("rejects an empty kind or an over-long kind", () => {
    expect(submissionSchema.safeParse({ ...base, kind: "" }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...base, kind: "x".repeat(25) }).success).toBe(false);
  });

  it("rejects more than 16 harmonic_function tags or an over-long tag", () => {
    expect(
      submissionSchema.safeParse({ ...base, harmonic_function: Array.from({ length: 17 }, () => "ii") })
        .success,
    ).toBe(false);
    expect(
      submissionSchema.safeParse({ ...base, harmonic_function: ["x".repeat(25)] }).success,
    ).toBe(false);
  });

  it("all seed licks still validate against seedLickSchema (no new-field regression)", async () => {
    const { SEED_LICKS } = await import("@/data/seed-licks");
    const { SEED_GITAR_LICKS } = await import("@/data/seed-licks-gitar");
    const { SEED_BASS_LICKS } = await import("@/data/seed-licks-bass");
    // Vakten dekker ALLE tre korpus — gitar- og bass-licks må også passere
    // refineInstrument (hver note har `s`, utledet bånd i [0,15]).
    for (const lick of [...SEED_LICKS, ...SEED_GITAR_LICKS, ...SEED_BASS_LICKS]) {
      const r = seedLickSchema.safeParse(lick);
      expect(r.success, `slug "${lick.slug}" failed: ${!r.success ? JSON.stringify(r.error.issues) : ""}`).toBe(
        true,
      );
    }
  });
});

describe("instrument — piano/gitar-kobling (0005_instrument, refineInstrument)", () => {
  it("defaulter til 'piano' når feltet mangler (bakoverkompat)", () => {
    const r = submissionSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.instrument).toBe("piano");
  });

  it("avviser en piano-note som bærer streng (s)", () => {
    expect(
      submissionSchema.safeParse({ ...base, notes: [{ p: 60, t: 0, d: 1, h: "R", s: 2 }] }).success,
    ).toBe(false);
  });

  it("aksepterer en gitar-lick der hver note har gyldig s og utledet bånd i [0,15]", () => {
    const r = submissionSchema.safeParse({
      ...base,
      instrument: "gitar",
      notes: [
        { p: 55, t: 0, d: 1, h: "R", s: 3 }, // G3 åpen (bånd 0)
        { p: 60, t: 1, d: 1, h: "R", s: 3 }, // bånd 5
      ],
      beats: 4,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.instrument).toBe("gitar");
  });

  it("avviser en gitar-note uten streng (s)", () => {
    expect(
      submissionSchema.safeParse({
        ...base,
        instrument: "gitar",
        notes: [{ p: 55, t: 0, d: 1, h: "R" }],
      }).success,
    ).toBe(false);
  });

  it("avviser s utenfor 0–5 (noteSchema-grense)", () => {
    expect(
      submissionSchema.safeParse({
        ...base,
        instrument: "gitar",
        notes: [{ p: 60, t: 0, d: 1, h: "R", s: 6 }],
      }).success,
    ).toBe(false);
  });

  it("avviser gitar-note der utledet bånd > 15 (p − GUITAR_STANDARD[s])", () => {
    // p=60 på lav-E-strengen (s=0, E2=40) ⇒ bånd 20 > 15.
    expect(
      submissionSchema.safeParse({
        ...base,
        instrument: "gitar",
        notes: [{ p: 60, t: 0, d: 1, h: "R", s: 0 }],
      }).success,
    ).toBe(false);
  });

  it("håndhever koblingen også i seedLickSchema", () => {
    expect(
      seedLickSchema.safeParse({ ...base, slug: "gitar-lick", instrument: "gitar", notes: [{ p: 55, t: 0, d: 1, h: "R" }] })
        .success,
    ).toBe(false);
    expect(
      seedLickSchema.safeParse({ ...base, slug: "gitar-lick", instrument: "gitar", notes: [{ p: 55, t: 0, d: 1, h: "R", s: 3 }] })
        .success,
    ).toBe(true);
  });
});

describe("instrument — bass-kobling (4-strengs EADG, tuning-tabell-drevet refineInstrument)", () => {
  const bassBase = { ...base, instrument: "bass" as const };

  it("aksepterer en bass-lick der hver note har gyldig s (0–3) og utledet bånd i [0,15]", () => {
    const r = submissionSchema.safeParse({
      ...bassBase,
      notes: [
        { p: 28, t: 0, d: 1, h: "R", s: 0 }, // E1 åpen (lav E-streng)
        { p: 43, t: 1, d: 1, h: "R", s: 3 }, // G2 åpen (G-streng)
      ],
      beats: 4,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.instrument).toBe("bass");
  });

  it("avviser en bass-note uten streng (s)", () => {
    expect(
      submissionSchema.safeParse({ ...bassBase, notes: [{ p: 28, t: 0, d: 1, h: "R" }] }).success,
    ).toBe(false);
  });

  it("avviser bass-note der utledet bånd > 15 (p − BASS_EADG[s])", () => {
    // p=60 på lav-E-strengen (s=0, E1=28) ⇒ bånd 32 > 15.
    expect(
      submissionSchema.safeParse({ ...bassBase, notes: [{ p: 60, t: 0, d: 1, h: "R", s: 0 }] }).success,
    ).toBe(false);
  });

  it("avviser s=4/5 for bass (bare 4 strenger, s ∈ 0–3) — noteSchema slipper dem, refineInstrument stopper dem", () => {
    expect(
      submissionSchema.safeParse({ ...bassBase, notes: [{ p: 40, t: 0, d: 1, h: "R", s: 4 }] }).success,
    ).toBe(false);
    expect(
      submissionSchema.safeParse({ ...bassBase, notes: [{ p: 40, t: 0, d: 1, h: "R", s: 5 }] }).success,
    ).toBe(false);
  });

  it("håndhever bass-koblingen også i seedLickSchema", () => {
    expect(
      seedLickSchema.safeParse({ ...base, slug: "bass-lick", instrument: "bass", notes: [{ p: 43, t: 0, d: 1, h: "R" }] })
        .success,
    ).toBe(false);
    expect(
      seedLickSchema.safeParse({ ...base, slug: "bass-lick", instrument: "bass", notes: [{ p: 43, t: 0, d: 1, h: "R", s: 3 }] })
        .success,
    ).toBe(true);
  });
});
