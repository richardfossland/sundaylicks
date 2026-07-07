// ── Chord voicings (pure MIDI-pitch generators, no audio) ───────────────────
//
// Turns a chord (root pitch class + quality string) into an actual set of MIDI
// pitches, centred around C4 = 60 like the rest of the app. Builds on the
// interval vocabulary of `src/lib/music.ts` (CHORD_INTERVALS/chordPitchClasses)
// but adds octave-aware tensions (9ths etc.) that raw pitch classes can't
// express, and reuses `nearestOffset` from `src/lib/transpose.ts` to place the
// root in the nearest register to C4 instead of always jumping up to +11.

import { nearestOffset } from '../transpose'

export type VoicingStyle = 'close' | 'rootless-a' | 'rootless-b' | 'gospel' | 'quartal' | 'shell' | 'drop2'

interface ChordTones {
  third: number // semitone offset from root
  fifth: number | null
  seventh: number | null // treat 6ths as occupying the "seventh" slot
}

// Local, slightly larger vocabulary than music.ts's CHORD_INTERVALS (which is
// tuned for pitch-class highlighting, not register-aware voicings). Falls
// back to a major triad for anything unrecognised.
const TONES: Record<string, ChordTones> = {
  '': { third: 4, fifth: 7, seventh: null },
  m: { third: 3, fifth: 7, seventh: null },
  '7': { third: 4, fifth: 7, seventh: 10 },
  maj7: { third: 4, fifth: 7, seventh: 11 },
  m7: { third: 3, fifth: 7, seventh: 10 },
  m7b5: { third: 3, fifth: 6, seventh: 10 },
  dim: { third: 3, fifth: 6, seventh: null },
  dim7: { third: 3, fifth: 6, seventh: 9 },
  sus4: { third: 5, fifth: 7, seventh: null },
  sus2: { third: 2, fifth: 7, seventh: null },
  '6': { third: 4, fifth: 7, seventh: 9 },
  m6: { third: 3, fifth: 7, seventh: 9 },
  '9': { third: 4, fifth: 7, seventh: 10 },
  m9: { third: 3, fifth: 7, seventh: 10 },
  maj9: { third: 4, fifth: 7, seventh: 11 },
  add9: { third: 4, fifth: 7, seventh: null },
  '7sus4': { third: 5, fifth: 7, seventh: 10 },
  '5': { third: 7, fifth: null, seventh: null }, // power chord: "third" slot holds the 5th
  aug: { third: 4, fifth: 8, seventh: null },
}

// Major 9th above the root — used as a generic colour tone for rootless/
// gospel voicings regardless of chord quality (the common jazz convention).
const NINTH = 14

function chordTones(quality: string): ChordTones {
  return TONES[quality] ?? TONES['']
}

/** MIDI pitch of `root`'s tonic in the register nearest to C4 (60). */
function rootMidiFor(root: number): number {
  return 60 + nearestOffset(0, root)
}

function sortAsc(pitches: number[]): number[] {
  return [...pitches].sort((a, b) => a - b)
}

/** All chord tones (root, 3rd, 5th, 7th) stacked within a single octave above the root. */
function closeVoicing(root: number, quality: string): number[] {
  const { third, fifth, seventh } = chordTones(quality)
  const rootMidi = rootMidiFor(root)
  const offsets = [0, third, ...(fifth !== null ? [fifth] : []), ...(seventh !== null ? [seventh] : [])]
  return sortAsc(offsets.map((o) => rootMidi + o))
}

/** Classic drop-2: take the close voicing and drop the 2nd-from-top note an octave. */
function drop2Voicing(root: number, quality: string): number[] {
  const close = closeVoicing(root, quality)
  if (close.length < 3) return close
  const out = [...close]
  out[out.length - 2] -= 12
  return sortAsc(out)
}

/** Guide-tone shell: low root + 3rd + 7th (or 5th, for a chord with no 7th). No filler. */
function shellVoicing(root: number, quality: string): number[] {
  const { third, fifth, seventh } = chordTones(quality)
  const rootMidi = rootMidiFor(root)
  const upper = seventh ?? fifth ?? 7
  return sortAsc([rootMidi - 12, rootMidi + third, rootMidi + upper])
}

/**
 * Bill Evans-style rootless voicing, type A: 3-5-7-9 stacked above the root
 * (root omitted — the bass/LH is assumed to cover it elsewhere).
 */
function rootlessAVoicing(root: number, quality: string): number[] {
  const { third, fifth, seventh } = chordTones(quality)
  const rootMidi = rootMidiFor(root)
  const offsets = [third, ...(fifth !== null ? [fifth] : []), ...(seventh !== null ? [seventh] : []), NINTH]
  return sortAsc(offsets.map((o) => rootMidi + o))
}

/**
 * Rootless type B: the same 3-5-7-9 tones as type A, but with the guide
 * tones (7-9) dropped an octave below the colour tones (3-5) — the classic
 * "other" rootless shape a comper alternates with type A.
 */
function rootlessBVoicing(root: number, quality: string): number[] {
  const { third, fifth, seventh } = chordTones(quality)
  const rootMidi = rootMidiFor(root)
  const lower = [...(seventh !== null ? [seventh - 12] : []), NINTH - 12]
  const upper = [third, ...(fifth !== null ? [fifth] : [])]
  return sortAsc([...lower, ...upper].map((o) => rootMidi + o))
}

/**
 * Quartal comping shape: three notes a perfect 4th apart, built from the
 * chord's 3rd (so major/minor colour still comes through even though 4ths
 * themselves are quality-agnostic).
 */
function quartalVoicing(root: number, quality: string): number[] {
  const { third } = chordTones(quality)
  const start = rootMidiFor(root) + third
  return sortAsc([start, start + 5, start + 10])
}

/**
 * Wide, two-handed gospel spread: low octave root, guide tones in the
 * middle, 9th on top for colour.
 */
function gospelVoicing(root: number, quality: string): number[] {
  const { third, fifth, seventh } = chordTones(quality)
  const rootMidi = rootMidiFor(root)
  const upper = seventh ?? fifth ?? 7
  return sortAsc([rootMidi - 24, rootMidi - 12, rootMidi + third, rootMidi + upper, rootMidi + NINTH])
}

/** A chord voicing as MIDI pitches (ascending), for a given root/quality/style. */
export function voicing(root: number, quality: string, style: VoicingStyle): number[] {
  switch (style) {
    case 'close':
      return closeVoicing(root, quality)
    case 'drop2':
      return drop2Voicing(root, quality)
    case 'shell':
      return shellVoicing(root, quality)
    case 'rootless-a':
      return rootlessAVoicing(root, quality)
    case 'rootless-b':
      return rootlessBVoicing(root, quality)
    case 'quartal':
      return quartalVoicing(root, quality)
    case 'gospel':
      return gospelVoicing(root, quality)
    default: {
      const exhaustive: never = style
      throw new Error(`Unknown voicing style: ${String(exhaustive)}`)
    }
  }
}
