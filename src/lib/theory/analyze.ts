// ── Lick analysis (pure, heuristic, no audio/DB) ─────────────────────────────
//
// Guesses a lick's tonality and harmonic function(s) from its `category` and
// `chords[]`. Deliberately heuristic — good enough for backfill/filtering,
// not a substitute for author-provided metadata.

import type { LickChord } from '@/types/lick'
import { pitchClass } from '../music'

export type Tonality = 'major' | 'minor'

export interface LickAnalysis {
  tonality: Tonality
  functions: string[]
}

/** Minimal shape needed to analyze a lick — works on a full `Lick` or a `GeneratedLick`. */
export interface AnalyzableLick {
  category: string
  chords: LickChord[]
}

const MINOR_QUALITIES = new Set(['m', 'm6', 'm7', 'm9', 'm(maj7)', 'dim', 'dim7', 'm7b5'])
const MAJOR_ISH_QUALITIES = new Set(['', 'maj7', 'maj9', '6', '9', 'add9', 'sus2', 'sus4', '7sus4', '5'])

/**
 * Guess major/minor from the chord most likely to be the tonal centre: the
 * LAST chord, since progressions in this app (turnarounds, ii-V-I, endings)
 * overwhelmingly resolve onto their tonic. Falls back to the first chord,
 * then to 'major'.
 */
export function guessTonality(chords: LickChord[]): Tonality {
  const candidates = [chords[chords.length - 1], chords[0]].filter((c): c is LickChord => Boolean(c))
  for (const c of candidates) {
    if (MINOR_QUALITIES.has(c.q)) return 'minor'
    if (MAJOR_ISH_QUALITIES.has(c.q) || c.q === '7') return 'major'
  }
  return 'major'
}

/** Semitone interval (0–11) from chord `a` down to chord `b` (b is a fifth below a → 7). */
function rootIntervalDown(a: LickChord, b: LickChord): number {
  return pitchClass(a.r - b.r)
}

function isDominantQuality(q: string): boolean {
  return q.includes('7') && !q.startsWith('maj') && !q.startsWith('m')
}

function isDiminishedQuality(q: string): boolean {
  return q.startsWith('dim') || q === 'm7b5'
}

/**
 * Heuristic harmonic-function tags for a lick, combining its declared
 * `category` with simple root-motion/quality scans over `chords[]`.
 */
export function analyzeLick(lick: AnalyzableLick): LickAnalysis {
  const tonality = guessTonality(lick.chords)
  const functions = new Set<string>()

  switch (lick.category) {
    case 'turnaround':
      functions.add('turnaround')
      break
    case 'two-five-one':
      functions.add('ii-V')
      break
    case 'ending':
      functions.add('cadence')
      break
    case 'intro':
      functions.add('pickup')
      break
    case 'fill':
      functions.add(lick.chords.length <= 1 ? 'fill-over-I' : 'fill')
      break
    case 'comp':
    case 'groove':
      functions.add('comp')
      break
    default:
      break
  }

  for (let i = 1; i < lick.chords.length; i++) {
    const prev = lick.chords[i - 1]
    const cur = lick.chords[i]
    const fifthDown = rootIntervalDown(prev, cur) === 7 // prev resolves down a 5th into cur

    if (fifthDown && isDominantQuality(prev.q)) {
      functions.add('dominant')
      if (i === lick.chords.length - 1) functions.add('dominant-resolution')
    }
    if (fifthDown && !isDominantQuality(prev.q)) {
      functions.add('ii-V')
    }
    if (isDiminishedQuality(cur.q) || isDiminishedQuality(prev.q)) {
      functions.add('passing')
    }
  }

  if (lick.chords.length >= 3) {
    const [first, second, third] = lick.chords
    const isTwoFiveOne =
      rootIntervalDown(first, second) === 7 &&
      rootIntervalDown(second, third) === 7 &&
      isDominantQuality(second.q)
    if (isTwoFiveOne) functions.add('ii-V-I')
  }

  return { tonality, functions: [...functions] }
}
