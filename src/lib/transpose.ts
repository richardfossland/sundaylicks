import type { Lick, LickNote, LickChord } from '@/types/lick'
import { MAX_FRET, TUNING_FOR } from './fretted/fretting.ts'
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

/**
 * Som `transposedNotes`, men for fretted licks (gitar/bass) oktav-foldes noter
 * som transponeringen skyver UTENFOR halsen tilbake i spillbart register
 * [tuning[0], tuning[siste] + MAX_FRET]. Uten dette tegnet gripebrettet og
 * TAB-en feil tonehøyde (opptil 5 halvtoner — clamp-grenen i fretPositions)
 * og vent-modus ble UMULIG å komme videre i: forventet tone fantes ikke på
 * brettet. 112 lick×toneart-kombinasjoner var rammet (N3a-granskingen).
 *
 * Folding skjer i transponerings-laget slik at LYD OG BILDE ER ENIGE — motoren,
 * brettet, TAB-en, eksportene og reelen leser alle samme funksjon. Rangen er
 * alltid ≥ 12 halvtoner bred, så foldingen terminerer garantert.
 */
export function transposedPlayableNotes(lick: Lick, targetKey: number): LickNote[] {
  const notes = transposedNotes(lick, targetKey)
  const tuning = TUNING_FOR[lick.instrument ?? 'piano']
  if (!tuning || tuning.length === 0) return notes
  const lo = tuning[0]
  const hi = tuning[tuning.length - 1] + MAX_FRET
  let anyFolded = false
  const folded = notes.map((n) => {
    let p = n.p
    while (p < lo) p += 12
    while (p > hi) p -= 12
    if (p === n.p) return n
    anyFolded = true
    return { ...n, p }
  })
  return anyFolded ? folded : notes
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
