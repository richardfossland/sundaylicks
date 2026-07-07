// ── Key / diatonic-harmony helpers (pure, no audio) ─────────────────────────
//
// A `Key` is just a tonic pitch class + mode. Everything here is stateless
// arithmetic on pitch classes (0–11), so it composes cleanly with
// `src/lib/music.ts` (chordPitchClasses/chordLabel) and `src/lib/transpose.ts`
// (nearestOffset) without duplicating either.

import { pitchClass } from '../music'

export type Mode = 'major' | 'minor'

export interface Key {
  root: number // pitch class 0–11, 0 = C
  mode: Mode
}

/** A diatonic chord built on one scale degree of a `Key`. */
export interface DiatonicChord {
  degree: 1 | 2 | 3 | 4 | 5 | 6 | 7
  roman: string
  root: number // pitch class 0–11
  quality: string // matches src/lib/music.ts CHORD_INTERVALS keys
}

/** Options controlling which diatonic-chord flavour is produced for minor keys. */
export interface DiatonicOptions {
  /**
   * Minor keys only. When true, borrows the V and vii chords from the
   * harmonic-minor scale (raised 7th degree) — the near-universal jazz/gospel
   * convention for a strong "minor ii–V–i" (e.g. Dm7b5–G7–Cm7). When false
   * (default), returns the natural-minor V/vii (v, VII).
   */
  harmonic?: boolean
}

// Circle of fifths, starting at C, going clockwise (up a fifth each step):
// C G D A E B F#/Gb Db Ab Eb Bb F.
export const CIRCLE_OF_FIFTHS: readonly number[] = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]

/** Shortest distance (0–6 steps) between two pitch classes around the circle of fifths. */
export function cofDistance(a: number, b: number): number {
  const ia = CIRCLE_OF_FIFTHS.indexOf(pitchClass(a))
  const ib = CIRCLE_OF_FIFTHS.indexOf(pitchClass(b))
  const raw = Math.abs(ia - ib)
  return Math.min(raw, CIRCLE_OF_FIFTHS.length - raw)
}

/** The relative major/minor of a key (same key signature, shared diatonic chords). */
export function relativeKey(key: Key): Key {
  if (key.mode === 'major') return { root: pitchClass(key.root + 9), mode: 'minor' }
  return { root: pitchClass(key.root + 3), mode: 'major' }
}

/** The parallel major/minor of a key (same tonic, different mode). */
export function parallelKey(key: Key): Key {
  return { root: key.root, mode: key.mode === 'major' ? 'minor' : 'major' }
}

/** The dominant (V) key — a perfect fifth up, same mode. */
export function dominantKey(key: Key): Key {
  return { root: pitchClass(key.root + 7), mode: key.mode }
}

/** The subdominant (IV) key — a perfect fourth up, same mode. */
export function subdominantKey(key: Key): Key {
  return { root: pitchClass(key.root + 5), mode: key.mode }
}

// Major scale / natural minor scale, as semitone steps from the tonic.
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11]
const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10]

// Diatonic 7th-chord qualities per degree (index 0 = degree 1), built by
// stacking thirds within the scale. Jazz/gospel lead-sheet convention.
const MAJOR_QUALITIES = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5']
const MAJOR_ROMANS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']

const MINOR_QUALITIES_NATURAL = ['m7', 'm7b5', 'maj7', 'm7', 'm7', 'maj7', '7']
const MINOR_ROMANS_NATURAL = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']

// Harmonic-minor borrowing: only V (m7 → 7) and vii (7 → dim7) change — the
// two degrees that actually contain the raised 7th in common practice.
const MINOR_QUALITIES_HARMONIC = ['m7', 'm7b5', 'maj7', 'm7', '7', 'maj7', 'dim7']
const MINOR_ROMANS_HARMONIC = ['i', 'ii°', 'III', 'iv', 'V', 'VI', 'vii°']

/**
 * The seven diatonic 7th chords of a key, in scale-degree order.
 * PLAN: major always uses I ii iii IV V vi vii°; minor defaults to natural
 * (v, VII) unless `{ harmonic: true }`, which borrows V7/vii°7.
 */
export function diatonicChords(key: Key, opts: DiatonicOptions = {}): DiatonicChord[] {
  const steps = key.mode === 'major' ? MAJOR_STEPS : MINOR_STEPS
  const romans = key.mode === 'major' ? MAJOR_ROMANS : opts.harmonic ? MINOR_ROMANS_HARMONIC : MINOR_ROMANS_NATURAL
  const qualities =
    key.mode === 'major' ? MAJOR_QUALITIES : opts.harmonic ? MINOR_QUALITIES_HARMONIC : MINOR_QUALITIES_NATURAL

  return steps.map((step, i) => ({
    degree: (i + 1) as DiatonicChord['degree'],
    roman: romans[i],
    root: pitchClass(key.root + step),
    quality: qualities[i],
  }))
}

/** The diatonic chord at a given scale degree (1–7) of a key. */
export function chordAtDegree(
  key: Key,
  degree: 1 | 2 | 3 | 4 | 5 | 6 | 7,
  opts: DiatonicOptions = {},
): DiatonicChord {
  return diatonicChords(key, opts)[degree - 1]
}

/**
 * Chords that are diatonic to BOTH keys (same root pitch class AND same
 * quality) — the natural "pivot chords" for a pivot-chord modulation.
 */
export function pivotChords(from: Key, to: Key): { root: number; quality: string }[] {
  const toKey = (c: { root: number; quality: string }) => `${c.root}|${c.quality}`
  const toSet = new Set(diatonicChords(to).map(toKey))
  const seen = new Set<string>()
  const out: { root: number; quality: string }[] = []
  for (const c of diatonicChords(from)) {
    const key = toKey(c)
    if (toSet.has(key) && !seen.has(key)) {
      seen.add(key)
      out.push({ root: c.root, quality: c.quality })
    }
  }
  return out
}
