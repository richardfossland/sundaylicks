import type { Lick, LickNote, LickChord } from '@/types/lick'
import { chordLabel, pitchClass } from './music'

/**
 * Semitone offset to move `originalKey` → `targetKey` by the NEAREST path,
 * so the lick keeps its register instead of leaping up to +11. Range: −6..+6.
 * PLAN §4.
 */
export function nearestOffset(originalKey: number, targetKey: number): number {
  const off = (((targetKey - originalKey) % 12) + 12) % 12
  return off > 6 ? off - 12 : off
}

/** Transpose a single note by a semitone offset. */
export function transposeNote(n: LickNote, offset: number): LickNote {
  return { ...n, p: n.p + offset }
}

/** Transpose a chord's root/bass by a semitone offset (kept as pitch classes). */
export function transposeChord(c: LickChord, offset: number): LickChord {
  return {
    ...c,
    r: pitchClass(c.r + offset),
    b: c.b === undefined ? undefined : pitchClass(c.b + offset),
  }
}

/** A lick's notes transposed to `targetKey`. Does not mutate the input. */
export function transposedNotes(lick: Lick, targetKey: number): LickNote[] {
  const offset = nearestOffset(lick.original_key, targetKey)
  if (offset === 0) return lick.notes
  return lick.notes.map((n) => transposeNote(n, offset))
}

/** A lick's chords transposed to `targetKey`. */
export function transposedChords(lick: Lick, targetKey: number): LickChord[] {
  const offset = nearestOffset(lick.original_key, targetKey)
  if (offset === 0) return lick.chords
  return lick.chords.map((c) => transposeChord(c, offset))
}

/** Display label for a chord already transposed (root/bass are pitch classes). */
export function labelForChord(c: LickChord): string {
  return chordLabel(c.r, c.q, c.b)
}
