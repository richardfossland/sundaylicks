import { z } from 'zod'

// Strict validation for lick data at seed / submission time. PLAN §7:
//   t ≥ 0, d > 0, p in 21–108 (A0–C8), t + d ≤ beats.

export const noteSchema = z.object({
  p: z.number().int().min(21).max(108),
  t: z.number().min(0),
  d: z.number().positive(),
  h: z.enum(['L', 'R']),
  v: z.number().min(0).max(1).optional(),
})

export const chordSchema = z.object({
  t: z.number().min(0),
  d: z.number().positive(),
  r: z.number().int().min(0).max(11),
  // Bound the quality string — it is rendered as a chord label; no legit value
  // exceeds a few chars (seed uses ≤4). Not enum'd because the seed set is
  // broader than the editor's palette.
  q: z.string().max(12),
  b: z.number().int().min(0).max(11).optional(),
})

// Shared musical content (everything except the DB-owned slug/status/etc).
export const lickContent = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(400).nullable(),
  category: z.enum(['turnaround', 'two-five-one', 'run', 'fill', 'ending', 'intro', 'comp', 'groove']),
  genre: z.enum([
    'gospel', 'worship', 'jazz', 'blues', 'boogie', 'neosoul', 'latin', 'classical', 'rock',
    'funk', 'rnb', 'stride', 'country', 'cinematic',
  ]),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  original_key: z.number().int().min(0).max(11),
  default_bpm: z.number().int().min(20).max(300),
  // Upper bounds bound the DB row size AND the client render cost: an unbounded
  // `beats` produces a giant SVG width in Notation.tsx, and unbounded arrays let
  // one submission freeze the admin browser. Generous vs. real data (seed max:
  // 32 beats, 6 tags, small note/chord counts).
  beats: z.number().positive().max(64),
  time_signature: z.string().regex(/^\d+\/\d+$/),
  notes: z.array(noteSchema).min(1).max(512),
  chords: z.array(chordSchema).max(64),
  tags: z.array(z.string().max(40)).max(32),
  // Theory metadata (0004_theory_metadata.sql). All three are optional with
  // defaults so every pre-existing lick (seed data + old submissions, none of
  // which carry these fields) still validates unchanged.
  mode: z.enum(['major', 'minor']).default('major'),
  // Scale-degree / functional tags, e.g. ['ii', 'V7'] or ['tritone-sub'].
  // Free text (not enum'd) — same rationale as `genre` above.
  harmonic_function: z.array(z.string().max(24)).max(16).default([]),
  // Distinguishes plain library licks ('lick', the default) from other
  // generated shapes (e.g. 'transition'). Free text — see `genre`.
  kind: z.string().min(1).max(24).default('lick'),
})

// t + d must stay within `beats`, for both notes and chords.
const refineWithinBeats = (
  lick: { beats: number; notes: { t: number; d: number }[]; chords: { t: number; d: number }[] },
  ctx: z.RefinementCtx,
) => {
  lick.notes.forEach((n, i) => {
    if (n.t + n.d > lick.beats + 1e-6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['notes', i],
        message: `note ${i} (t=${n.t}, d=${n.d}) går forbi beats=${lick.beats}`,
      })
    }
  })
  lick.chords.forEach((c, i) => {
    if (c.t + c.d > lick.beats + 1e-6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['chords', i],
        message: `akkord ${i} (t=${c.t}, d=${c.d}) går forbi beats=${lick.beats}`,
      })
    }
  })
}

// Full seed lick (author-provided slug required). Used by the seed script.
export const seedLickSchema = lickContent
  .extend({ slug: z.string().regex(/^[a-z0-9-]+$/, 'slug må være kebab-case') })
  .superRefine(refineWithinBeats)

// User submission (no slug — the server generates one). Used by /api/submit.
export const submissionSchema = lickContent.superRefine(refineWithinBeats)

export type ValidatedSeedLick = z.infer<typeof seedLickSchema>
export type LickSubmission = z.infer<typeof lickContent>
