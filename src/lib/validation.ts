import { z } from 'zod'
import { GUITAR_STANDARD, MAX_FRET } from './guitar/fretting'

// Strict validation for lick data at seed / submission time. PLAN §7:
//   t ≥ 0, d > 0, p in 21–108 (A0–C8), t + d ≤ beats.

export const noteSchema = z.object({
  p: z.number().int().min(21).max(108),
  t: z.number().min(0),
  d: z.number().positive(),
  h: z.enum(['L', 'R']),
  v: z.number().min(0).max(1).optional(),
  // Gitar-streng 0–5 (0 = lav E). Piano-noter har den aldri; refineInstrument
  // håndhever koblingen mellom `instrument` og tilstedeværelsen av `s`.
  s: z.number().int().min(0).max(5).optional(),
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
  // Instrument (0005_instrument.sql). Standard 'piano' → alle pre-eksisterende
  // licks (uten feltet) validerer uendret. 'gitar' krever `s` på hver note,
  // håndhevet av refineInstrument under.
  instrument: z.enum(['piano', 'gitar']).default('piano'),
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

// Instrument-koblingen (D1/D1b): gitar-licks MÅ ha `s` på hver note, og det
// utledede båndet f = p − GUITAR_STANDARD[s] må ligge i [0, 15]. Piano-noter
// skal ALDRI bære `s`. Zod-refinementet er spillbarhetsgaten for gitar-innhold.
const refineInstrument = (
  lick: { instrument: 'piano' | 'gitar'; notes: { p: number; s?: number }[] },
  ctx: z.RefinementCtx,
) => {
  if (lick.instrument === 'gitar') {
    lick.notes.forEach((n, i) => {
      if (n.s === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['notes', i, 's'],
          message: `gitar-note ${i} mangler streng (s)`,
        })
        return
      }
      const fret = n.p - GUITAR_STANDARD[n.s]
      if (fret < 0 || fret > MAX_FRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['notes', i],
          message: `gitar-note ${i}: utledet bånd ${fret} utenfor 0–${MAX_FRET} (p=${n.p}, s=${n.s})`,
        })
      }
    })
  } else {
    lick.notes.forEach((n, i) => {
      if (n.s !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['notes', i, 's'],
          message: `piano-note ${i} skal ikke ha streng (s)`,
        })
      }
    })
  }
}

// Full seed lick (author-provided slug required). Used by the seed script.
export const seedLickSchema = lickContent
  .extend({ slug: z.string().regex(/^[a-z0-9-]+$/, 'slug må være kebab-case') })
  .superRefine(refineWithinBeats)
  .superRefine(refineInstrument)

// User submission (no slug — the server generates one). Used by /api/submit.
export const submissionSchema = lickContent
  .superRefine(refineWithinBeats)
  .superRefine(refineInstrument)

export type ValidatedSeedLick = z.infer<typeof seedLickSchema>
export type LickSubmission = z.infer<typeof lickContent>

// Oppslagsverk-oppføring (data/glossary.ts). `short` er bundet fordi den
// rendres i en liten popover; `body` er romslig men bundet (render-kost).
export const glossaryTermSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id må være kebab-case'),
  term: z.string().min(1).max(60),
  aliases: z.array(z.string().min(1).max(60)).max(16).optional(),
  category: z.enum(['harmoni', 'rytme', 'sjanger', 'teknikk', 'notasjon', 'app']),
  short: z.string().min(1).max(240),
  body: z.string().min(1).max(3000),
  seeAlso: z.array(z.string().min(1)).max(8).optional(),
  noAutoLink: z.boolean().optional(),
})
