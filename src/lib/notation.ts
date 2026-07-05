import { StaveNote, Accidental } from 'vexflow'
import type { LickNote, Hand } from '@/types/lick'
import { NOTE_NAMES, pitchClass, octaveOf } from './music'

// Convert MIDI-in-beats data into VexFlow StaveNotes for one hand/staff.
// Power-of-two durations (0.25/0.5/1/2/4) render directly; triplet durations
// (1/3 = triplet-eighth, 2/3 = triplet-quarter) are detected and returned as
// tuplet groups (every 3 consecutive triplet notes) so the caller can draw the
// "3" bracket. The voice runs non-strict; overlaps within a hand aren't expected.

const EPS = 1e-6
const T8 = 1 / 3 // triplet eighth
const T4 = 2 / 3 // triplet quarter
// beats → VexFlow duration base code (no dots).
const UNITS: [number, string][] = [
  [4, 'w'],
  [2, 'h'],
  [1, 'q'],
  [0.5, '8'],
  [0.25, '16'],
]

function durationCode(beats: number): string {
  let best = UNITS[2]
  let bestErr = Infinity
  for (const u of UNITS) {
    const err = Math.abs(u[0] - beats)
    if (err < bestErr) {
      bestErr = err
      best = u
    }
  }
  return best[1]
}

function classify(beats: number): { code: string; triplet: boolean } {
  if (Math.abs(beats - T8) < 0.03) return { code: '8', triplet: true }
  if (Math.abs(beats - T4) < 0.03) return { code: 'q', triplet: true }
  return { code: durationCode(beats), triplet: false }
}

/** VexFlow key string for a MIDI note, e.g. 63 → "eb/4". */
export function keyString(midi: number): string {
  const name = NOTE_NAMES[pitchClass(midi)].toLowerCase() // 'c', 'c#', 'eb'
  return `${name}/${octaveOf(midi)}`
}

interface Group {
  t: number
  d: number
  midis: number[]
}

function groupByOnset(notes: LickNote[]): Group[] {
  const map = new Map<number, Group>()
  for (const n of notes) {
    const key = Math.round(n.t * 1000)
    const g = map.get(key)
    if (g) {
      g.midis.push(n.p)
      g.d = Math.min(g.d, n.d) // chord duration = shortest member
    } else {
      map.set(key, { t: n.t, d: n.d, midis: [n.p] })
    }
  }
  return [...map.values()].sort((a, b) => a.t - b.t)
}

// Greedy split of a rest gap into representable rest durations.
function restCodes(len: number): string[] {
  const out: string[] = []
  let rem = len
  for (const [beats, code] of UNITS) {
    while (rem >= beats - EPS) {
      out.push(code + 'r')
      rem -= beats
    }
  }
  return out
}

function restNote(code: string, clef: Hand): StaveNote {
  return new StaveNote({
    clef: clef === 'R' ? 'treble' : 'bass',
    keys: [clef === 'R' ? 'b/4' : 'd/3'],
    duration: code,
  })
}

/** Build StaveNotes (with rests) for one hand, plus triplet groups to bracket. */
export function buildStaveNotes(
  all: LickNote[],
  hand: Hand,
  beats: number,
): { notes: StaveNote[]; tuplets: StaveNote[][] } {
  const clef = hand === 'R' ? 'treble' : 'bass'
  const groups = groupByOnset(all.filter((n) => n.h === hand))
  const notes: StaveNote[] = []
  const tuplets: StaveNote[][] = []
  let run: StaveNote[] = []
  let cursor = 0

  const fill = (from: number, to: number) => {
    if (to - from < EPS) return
    run = [] // a rest breaks any partial triplet run
    for (const code of restCodes(to - from)) notes.push(restNote(code, hand))
  }

  for (const g of groups) {
    if (g.t > cursor + EPS) fill(cursor, g.t)
    const midis = [...g.midis].sort((a, b) => a - b)
    const { code, triplet } = classify(g.d)
    const note = new StaveNote({ clef, keys: midis.map(keyString), duration: code })
    midis.forEach((m, i) => {
      const nm = NOTE_NAMES[pitchClass(m)]
      if (nm.includes('#')) note.addModifier(new Accidental('#'), i)
      else if (nm.includes('b')) note.addModifier(new Accidental('b'), i)
    })
    notes.push(note)
    if (triplet) {
      run.push(note)
      if (run.length === 3) {
        tuplets.push(run)
        run = []
      }
    } else {
      run = []
    }
    cursor = g.t + g.d
  }
  fill(cursor, beats)
  return { notes, tuplets }
}
