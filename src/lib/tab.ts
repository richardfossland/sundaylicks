import type { LickNote } from '@/types/lick'
import { fretPositions } from './guitar/fretting'

// ── Gitar-TAB-bygging (ren, ingen VexFlow, ingen DOM) ────────────────────────
// Speiler notation.ts sin onset-gruppering og varighets-klassifisering, men for
// gitartabulatur: ÉN stemme som samler alle strenger, posisjoner utledet fra
// fretPositions (D1c — om-fingrer hele licken hvis et bånd faller utenfor 0–15),
// og VexFlow-strengen `str = 6 − s` (D1: `s` er 0-basert 0 = lav E; VexFlow TAB
// bruker 1-basert 1 = høy E … 6 = lav E). Denne filen returnerer RENE
// beskrivelser (TabEvent) slik at den er node-testbar; Tab.tsx bygger VexFlow
// TabNote/GhostNote/Tuplet av dem ved rendering.

const EPS = 1e-6
const T8 = 1 / 3 // triol-åttendedel
const T4 = 2 / 3 // triol-fjerdedel
// beats → VexFlow varighetskode (uten punkteringer).
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

// Grådig splitt av et pause-gap i representerbare pause-varigheter.
function restCodes(len: number): string[] {
  const out: string[] = []
  let rem = len
  for (const [beats, code] of UNITS) {
    while (rem >= beats - EPS) {
      out.push(code)
      rem -= beats
    }
  }
  return out
}

/** En VexFlow TAB-posisjon: 1-basert streng (1 = høy E), absolutt bånd. */
export interface TabPosition {
  str: number
  fret: number
}

/** Én tabulatur-hendelse: enten en (akkord-)node eller en pause (kun spacing). */
export interface TabEvent {
  positions: TabPosition[] // tom = pause
  duration: string // VexFlow varighetskode ('w' | 'h' | 'q' | '8' | '16')
  triplet: boolean
  rest: boolean
}

interface Group {
  t: number
  d: number
  idx: number[] // indekser inn i det opprinnelige note-arrayet
}

function groupByOnset(notes: LickNote[]): Group[] {
  const map = new Map<number, Group>()
  notes.forEach((n, i) => {
    const key = Math.round(n.t * 1000)
    const g = map.get(key)
    if (g) {
      g.idx.push(i)
      g.d = Math.min(g.d, n.d) // akkord-varighet = korteste medlem
    } else {
      map.set(key, { t: n.t, d: n.d, idx: [i] })
    }
  })
  return [...map.values()].sort((a, b) => a.t - b.t)
}

/**
 * Bygg tabulatur-hendelser for hele licken pluss triol-grupper (indekser inn i
 * `events`) som skal klamres. `notes` er allerede transponert; `beats` er total
 * lengde. Pauser fyller mellomrom (kun spacing). Rekkefølgen i `events` er
 * kronologisk.
 */
export function buildTabNotes(
  notes: LickNote[],
  beats: number,
): { events: TabEvent[]; tuplets: number[][] } {
  const positions = fretPositions(notes, 0)
  const groups = groupByOnset(notes)
  const events: TabEvent[] = []
  const tuplets: number[][] = []
  let run: number[] = [] // indekser inn i `events` for pågående triol-løp
  let cursor = 0

  const pushRests = (from: number, to: number) => {
    if (to - from < EPS) return
    run = [] // en pause bryter et delvis triol-løp
    for (const code of restCodes(to - from)) {
      events.push({ positions: [], duration: code, triplet: false, rest: true })
    }
  }

  for (const g of groups) {
    if (g.t > cursor + EPS) pushRests(cursor, g.t)
    // str = 6 − streng (D1). Bruk posisjonens streng, ikke den lagrede `s`, så
    // en om-fingret note (fretPositions kan bytte streng når båndet sprenger
    // 0–15) fortsatt har streng og bånd som hører sammen (p = tuning[str] + fret).
    const positionsForGroup = g.idx
      .map((i) => ({ str: 6 - positions[i].string, fret: positions[i].fret }))
      .sort((a, b) => b.str - a.str) // lav streng (str 6 = lav E) → høy streng (str 1)
    const { code, triplet } = classify(g.d)
    const eventIndex = events.length
    events.push({ positions: positionsForGroup, duration: code, triplet, rest: false })
    if (triplet) {
      run.push(eventIndex)
      if (run.length === 3) {
        tuplets.push(run)
        run = []
      }
    } else {
      run = []
    }
    cursor = g.t + g.d
  }
  pushRests(cursor, beats)
  return { events, tuplets }
}
