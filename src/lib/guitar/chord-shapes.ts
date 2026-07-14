// ── Guitar chord shapes (pure, no audio) ─────────────────────────────────────
//
// The grip library behind the gitar content: ~20 open ("cowboy") shapes plus
// movable E-form and A-form barre derivations, so every root × common quality
// resolves to at least one playable grip. Portert verbatim fra SundaySchool; den
// eneste endringen er at standardstemmingen gjenbrukes fra lib/guitar/fretting.ts
// (GUITAR_STANDARD) i stedet for en lokal kopi, så det finnes én sannhetskilde.
//
// Conventions:
//  • `frets` has 6 entries in string order 6→1 (low E first). Values are
//    ABSOLUTE fret numbers: 0 = open string, 'x' = muted. `baseFret` is only
//    the diagram window start (1 = open position with a nut); it never changes
//    what sounds — `shapePitches` reads the absolute frets directly.
//  • Standard tuning E2 A2 D3 G3 B3 E4 = MIDI [40, 45, 50, 55, 59, 64].
//  • Qualities without a natural guitar form fall back to a playable core
//    (add9→major, 9→7, 6→major, …) so gospel colour chords still get a grip;
//    truly unplayable qualities (dim, m7b5, aug) return [] and callers fall
//    back to a pitch-class voicing or a capo penalty.

import { GUITAR_STANDARD } from './fretting'

export type FretCell = number | 'x'

export interface Shape {
  /** 6 entries, string 6→1 (low E first). Absolute fret; 0 = open; 'x' = muted. */
  frets: FretCell[]
  /** First fret of the diagram window. 1 = open position (draw the nut). */
  baseFret: number
  /** Optional fingering per string (0 = open/muted), same order as `frets`. */
  fingers?: number[]
}

/** Standard tuning, string 6→1: E2 A2 D3 G3 B3 E4. Gjenbrukt fra fretting.ts. */
export const STANDARD_TUNING = GUITAR_STANDARD

interface OpenEntry {
  root: number // pitch class 0–11
  q: string
  shape: Shape
}

const open = (root: number, q: string, frets: FretCell[], fingers?: number[]): OpenEntry => ({
  root,
  q,
  shape: { frets, baseFret: 1, fingers },
})

// Pitch classes: C=0 D=2 E=4 F=5 G=7 A=9 B=11.
const OPEN_SHAPES: OpenEntry[] = [
  // E family
  open(4, '', [0, 2, 2, 1, 0, 0], [0, 2, 3, 1, 0, 0]),
  open(4, 'm', [0, 2, 2, 0, 0, 0], [0, 2, 3, 0, 0, 0]),
  open(4, '7', [0, 2, 0, 1, 0, 0], [0, 2, 0, 1, 0, 0]),
  open(4, 'm7', [0, 2, 0, 0, 0, 0], [0, 2, 0, 0, 0, 0]),
  open(4, 'sus4', [0, 2, 2, 2, 0, 0], [0, 2, 3, 4, 0, 0]),
  // A family
  open(9, '', ['x', 0, 2, 2, 2, 0], [0, 0, 1, 2, 3, 0]),
  open(9, 'm', ['x', 0, 2, 2, 1, 0], [0, 0, 2, 3, 1, 0]),
  open(9, '7', ['x', 0, 2, 0, 2, 0], [0, 0, 2, 0, 3, 0]),
  open(9, 'maj7', ['x', 0, 2, 1, 2, 0], [0, 0, 2, 1, 3, 0]),
  open(9, 'm7', ['x', 0, 2, 0, 1, 0], [0, 0, 2, 0, 1, 0]),
  open(9, 'sus4', ['x', 0, 2, 2, 3, 0], [0, 0, 1, 2, 3, 0]),
  open(9, 'sus2', ['x', 0, 2, 2, 0, 0], [0, 0, 2, 3, 0, 0]),
  // D family
  open(2, '', ['x', 'x', 0, 2, 3, 2], [0, 0, 0, 1, 3, 2]),
  open(2, 'm', ['x', 'x', 0, 2, 3, 1], [0, 0, 0, 2, 3, 1]),
  open(2, '7', ['x', 'x', 0, 2, 1, 2], [0, 0, 0, 2, 1, 3]),
  open(2, 'm7', ['x', 'x', 0, 2, 1, 1], [0, 0, 0, 2, 1, 1]),
  open(2, 'sus4', ['x', 'x', 0, 2, 3, 3], [0, 0, 0, 1, 3, 4]),
  // C family
  open(0, '', ['x', 3, 2, 0, 1, 0], [0, 3, 2, 0, 1, 0]),
  open(0, 'maj7', ['x', 3, 2, 0, 0, 0], [0, 3, 2, 0, 0, 0]),
  open(0, '7', ['x', 3, 2, 3, 1, 0], [0, 3, 2, 4, 1, 0]),
  open(0, 'add9', ['x', 3, 2, 0, 3, 0], [0, 3, 2, 0, 4, 0]),
  // G family
  open(7, '', [3, 2, 0, 0, 0, 3], [2, 1, 0, 0, 0, 3]),
  open(7, '7', [3, 2, 0, 0, 0, 1], [3, 2, 0, 0, 0, 1]),
]

// Movable barre templates (fret offsets from the barre fret). Shifting the open
// E/A families up by n frets gives the classic E-form (root on string 6, pc
// 4 + n) and A-form (root on string 5, pc 9 + n) barre chords.
const E_FORM: Record<string, FretCell[]> = {
  '': [0, 2, 2, 1, 0, 0],
  m: [0, 2, 2, 0, 0, 0],
  '7': [0, 2, 0, 1, 0, 0],
  m7: [0, 2, 0, 0, 0, 0],
  sus4: [0, 2, 2, 2, 0, 0],
}
const A_FORM: Record<string, FretCell[]> = {
  '': ['x', 0, 2, 2, 2, 0],
  m: ['x', 0, 2, 2, 1, 0],
  '7': ['x', 0, 2, 0, 2, 0],
  maj7: ['x', 0, 2, 1, 2, 0],
  m7: ['x', 0, 2, 0, 1, 0],
  sus4: ['x', 0, 2, 2, 3, 0],
  sus2: ['x', 0, 2, 2, 0, 0],
}

// Colour qualities without a natural open/barre form simplify to a playable
// core. Deliberately conservative — the simplified grip is always a subset of
// the written chord's colour, never a foreign sound.
const QUALITY_FALLBACK: Record<string, string> = {
  add9: '',
  '9': '7',
  m9: 'm7',
  maj9: 'maj7',
  '6': '',
  m6: 'm',
  '7sus4': 'sus4',
  '5': '',
}

const pc = (n: number) => ((n % 12) + 12) % 12

/** Shift a movable template up `n` frets (fretted strings only). */
function shiftTemplate(template: FretCell[], n: number): Shape {
  return {
    frets: template.map((f) => (f === 'x' ? 'x' : f + n)),
    baseFret: n,
  }
}

/**
 * "How easy/open does this grip sound?" — higher is better. Open strings
 * dominate; fuller grips get a small bonus; higher positions on the neck are
 * progressively penalised (a barre at fret 8 scores far below one at fret 1).
 */
export function openness(shape: Shape): number {
  let openStrings = 0
  let sounded = 0
  for (const f of shape.frets) {
    if (f === 'x') continue
    sounded++
    if (f === 0) openStrings++
  }
  return openStrings * 2 + sounded * 0.1 - (shape.baseFret - 1)
}

/**
 * All known grips for a root pitch class + quality, best (most open) first.
 * Open shapes come before barres; unknown colour qualities fall back to their
 * playable core (see QUALITY_FALLBACK). Returns [] when nothing fits (dim/aug…).
 */
export function shapesFor(rootPc: number, q: string): Shape[] {
  const root = pc(rootPc)
  const direct = collect(root, q)
  if (direct.length > 0) return direct
  const fallback = QUALITY_FALLBACK[q]
  return fallback !== undefined ? collect(root, fallback) : []
}

function collect(root: number, q: string): Shape[] {
  const out: Shape[] = []
  for (const entry of OPEN_SHAPES) {
    if (entry.root === root && entry.q === q) out.push(entry.shape)
  }
  // Barre derivations. n = 0 would duplicate the open template shape (which is
  // already registered above), so only true barres (fret 1–11) are added.
  const eFret = pc(root - 4)
  if (E_FORM[q] && eFret >= 1) out.push(shiftTemplate(E_FORM[q], eFret))
  const aFret = pc(root - 9)
  if (A_FORM[q] && aFret >= 1) out.push(shiftTemplate(A_FORM[q], aFret))
  return out.sort((a, b) => openness(b) - openness(a))
}

/**
 * The MIDI notes a grip actually sounds (low string first), for strum playback
 * and chord-match validation. `frets` are absolute, so this is tuning + fret.
 */
export function shapePitches(shape: Shape, tuning: readonly number[] = STANDARD_TUNING): number[] {
  const out: number[] = []
  shape.frets.forEach((f, i) => {
    if (f === 'x') return
    out.push(tuning[i] + f)
  })
  return out
}
