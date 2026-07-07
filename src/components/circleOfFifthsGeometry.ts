// ── CircleOfFifths — pure geometry + relation-copy helpers ──────────────────
//
// Kept out of the .tsx component so it's plain, dependency-free logic that
// `src/**/*.test.ts` (vitest, node env) can cover directly — component files
// aren't part of the test glob. No React here.

import { chordLabel, pitchClass } from '@/lib/music'
import { CIRCLE_OF_FIFTHS, cofDistance, pivotChords, relativeKey, type Key } from '@/lib/theory/keys'

export interface Point {
  x: number
  y: number
}

/** Layout constants for a 300×300 viewBox circle-of-fifths chart. */
export const RING = {
  size: 300,
  center: 150,
  outerRadius: 112,
  innerRadius: 72,
  outerButton: 21,
  innerButton: 15,
} as const

/** Angle (degrees, clockwise from 12 o'clock) of the i-th of `total` evenly spaced positions. */
export function angleForIndex(i: number, total = 12): number {
  return (360 / total) * i
}

/** A point on a circle of radius `r` around (cx, cy), at `angleDeg` clockwise from the top. */
export function pointOnCircle(cx: number, cy: number, r: number, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) }
}

/** Position (0–11) of a pitch class around the circle of fifths. */
export function indexOfPitchClass(pc: number): number {
  return CIRCLE_OF_FIFTHS.indexOf(pitchClass(pc))
}

/** The 12 major-key pitch classes, in circle-of-fifths (clockwise, C at top) order. */
export function majorRing(): readonly number[] {
  return CIRCLE_OF_FIFTHS
}

/** The relative-minor pitch class shown in the inner ring at the same angle as a major root. */
export function relativeMinorOf(majorRoot: number): number {
  return relativeKey({ root: majorRoot, mode: 'major' }).root
}

function sameKey(a: Key, b: Key): boolean {
  return a.root === b.root && a.mode === b.mode
}

/** Human copy describing how `from` relates to `to` — fifths-distance + relative/parallel note. */
export function describeDistance(from: Key, to: Key): string {
  if (sameKey(from, to)) return 'Samme toneart'
  const dist = cofDistance(from.root, to.root)
  const steps = dist === 1 ? '1 kvint' : `${dist} kvinter`
  if (from.root === to.root) return `${steps} unna (parallell dur/moll)`
  const rel = relativeKey(from)
  if (rel.root === to.root && rel.mode === to.mode) return `${steps} unna (relativ dur/moll)`
  return `${steps} unna på kvintsirkelen`
}

/** Human copy listing chords diatonic to both keys — the natural pivots for a modulation. */
export function describePivots(from: Key, to: Key): string {
  const pivots = pivotChords(from, to)
  if (pivots.length === 0) return 'Ingen felles akkorder — bruk en sekundærdominant.'
  return `Felles akkorder: ${pivots.map((p) => chordLabel(p.root, p.quality)).join(', ')}`
}
