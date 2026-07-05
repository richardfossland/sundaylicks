// ── Music theory helpers (pure, no audio) ───────────────────────────────────

// Pragmatic pitch-class → name mapping (a mix of sharps/flats that reads well
// across gospel keys). PLAN §4 notes proper per-key enharmonic spelling is a
// later refinement.
export const NOTE_NAMES = [
  'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
] as const

export const KEY_NAMES = NOTE_NAMES // 12 keys, same spelling

/** Pitch class (0–11) of a MIDI note. */
export function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12
}

/** Octave number of a MIDI note (C4 = 60 → 4, scientific pitch notation). */
export function octaveOf(midi: number): number {
  return Math.floor(midi / 12) - 1
}

/** Human note name incl. octave, e.g. 60 → "C4". */
export function noteName(midi: number): string {
  return NOTE_NAMES[pitchClass(midi)] + octaveOf(midi)
}

/** Is this pitch class a black key on the piano? */
export function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(pitchClass(midi))
}

/**
 * Render a chord symbol in a given transposition offset.
 * root/bass are pitch classes 0–11; quality is appended verbatim.
 */
export function chordLabel(root: number, quality: string, bass?: number): string {
  const base = NOTE_NAMES[pitchClass(root)] + quality
  if (bass === undefined || bass === null) return base
  return `${base}/${NOTE_NAMES[pitchClass(bass)]}`
}

/** Seconds per beat at a given tempo. */
export function secondsPerBeat(bpm: number): number {
  return 60 / bpm
}
