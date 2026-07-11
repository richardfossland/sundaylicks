// ── Skala-øvingslicks (rene, dep-frie) ──────────────────────────────────────
//
// Gjør en skala om til spillbart `GeneratedLick`-innhold (MIDI-toner + akkord-
// symboler), akkurat som spice.ts' voicingLick — slik at SkalaTab kan mate det
// rett inn i <Practice lick={…}/> og få tempo-trapp, vent-modus, transponering,
// metronom og eksport gratis. Ingen lyd, ingen DB.
//
// To generatorer:
//   • scalePracticeLick — et rent øvemønster (opp-ned / terser / grupper på 4).
//     Venstre hånd markerer takten (rot-oktav, eller en shell-voicing hvis et
//     akkord-kontekst er gitt).
//   • scaleOverChordLick — «hør skalaen over akkorden»: venstre hånd holder en
//     shell-voicing av akkorden, høyre spiller skalaen opp og ned i åttedeler.
//
// Dynamikk: gruppestarter aksentueres (v 0.9), øvrige toner ligger lavere
// (v 0.7) — samme dynamikk-tankegang som bibliotekets håndlagde licks.

import type { ChordChoice } from '@/components/SpiceChordPicker'
import type { GeneratedLick } from './transitions'
import type { LickChord, LickNote } from '@/types/lick'
import { KEY_NAMES, chordLabel, pitchClass } from '../music'
import { nearestOffset } from '../transpose'
import { voicing } from './voicings'
import { scalePitches, type ScaleDef } from './scales'

export type ScalePattern = 'opp-ned' | 'terser' | 'grupper4'

export const SCALE_PATTERN_LABEL: Record<ScalePattern, string> = {
  'opp-ned': 'rett opp og ned',
  terser: 'i terser',
  grupper4: 'i grupper på 4',
}

const ACCENT_V = 0.9
const PLAIN_V = 0.7
const LH_V = 0.82

/** MIDI-grunntone i registeret nærmest C4 (60), som scalePitches. */
function rootMidiFor(rootPc: number): number {
  return 60 + nearestOffset(0, pitchClass(rootPc))
}

/** Overlay-trygg akkordkvalitet: music.ts kjenner ikke dim7 → vis som dim. */
function overlayQuality(quality: string): string {
  return quality === 'dim7' ? 'dim' : quality
}

/** Én akkord per takt over hele lengden — mater ChordStrip/overlay pent. */
function chordsPerBar(beats: number, rootPc: number, quality: string): LickChord[] {
  const q = overlayQuality(quality)
  const out: LickChord[] = []
  for (let t = 0; t < beats - 1e-6; t += 4) {
    out.push({ t, d: Math.min(4, beats - t), r: pitchClass(rootPc), q })
  }
  return out
}

/**
 * Venstrehånds-underlag, én hendelse per takt.
 *   • uten akkord → rot-oktav (grunntone + oktav under).
 *   • med akkord  → shell-voicing (rot + ters + septim) av akkorden.
 */
function leftHand(beats: number, rootPc: number, chord?: ChordChoice): LickNote[] {
  const out: LickNote[] = []
  for (let t = 0; t < beats - 1e-6; t += 4) {
    const d = Math.min(4, beats - t)
    if (chord) {
      for (const p of voicing(chord.root, chord.quality, 'shell')) {
        out.push({ p, t, d, h: 'L', v: LH_V })
      }
    } else {
      const rm = rootMidiFor(rootPc)
      out.push({ p: rm - 12, t, d, h: 'L', v: LH_V })
      out.push({ p: rm, t, d, h: 'L', v: LH_V })
    }
  }
  return out
}

/** Bygg en høyrehåndslinje av en tone-sekvens i en gitt notverdi, med aksenter. */
function rightHand(seq: number[], step: number, accentEvery: number): LickNote[] {
  return seq.map((p, i) => ({
    p,
    t: i * step,
    d: step,
    h: 'R' as const,
    v: i % accentEvery === 0 ? ACCENT_V : PLAIN_V,
  }))
}

/** Toneklasse-liste opp og ned igjen (uten å doble topp/bunn). */
function upDown(pitches: number[]): number[] {
  return pitches.concat(pitches.slice(1, -1).reverse())
}

/** Tersrekke opp (1-3, 2-4, 3-5 …) og speilet ned. */
function inThirds(pitches: number[]): number[] {
  const up: number[] = []
  for (let i = 0; i + 2 < pitches.length; i++) {
    up.push(pitches[i], pitches[i + 2])
  }
  const down = [...up].reverse()
  return up.concat(down)
}

/** Firegrupper opp (1234, 2345, 3456 …). */
function inGroupsOf4(pitches: number[]): number[] {
  const out: number[] = []
  for (let i = 0; i + 3 < pitches.length; i++) {
    out.push(pitches[i], pitches[i + 1], pitches[i + 2], pitches[i + 3])
  }
  return out
}

function scaleMode(scale: ScaleDef): 'major' | 'minor' {
  // Liten ters (3 halvtoner) i skalaen → mollaktig for mode-feltet.
  return scale.intervals.includes(3) ? 'minor' : 'major'
}

/**
 * Et øvemønster over én skala. `opts.chord` bytter venstrehånd fra rot-oktav
 * til en holdt shell-voicing (og legger akkorden i overlay-en).
 */
export function scalePracticeLick(
  rootPc: number,
  scale: ScaleDef,
  pattern: ScalePattern,
  opts: { bpm?: number; chord?: ChordChoice } = {},
): GeneratedLick {
  const pitches = scalePitches(rootPc, scale, 2, 60)

  let seq: number[]
  let step: number
  let accentEvery: number
  if (pattern === 'grupper4') {
    seq = inGroupsOf4(pitches)
    step = 0.25 // sekstendeler
    accentEvery = 4
  } else if (pattern === 'terser') {
    seq = inThirds(pitches)
    step = 0.5 // åttedeler
    accentEvery = 2
  } else {
    seq = upDown(pitches)
    step = 0.5 // åttedeler
    accentEvery = scale.intervals.length // aksent ved hver oktav-/skalastart
  }

  const notes = rightHand(seq, step, accentEvery)
  const rawBeats = seq.length * step
  const beats = Math.max(4, Math.ceil(rawBeats / 4) * 4) // rund opp til hele takter

  const lh = leftHand(beats, rootPc, opts.chord)
  const chords = opts.chord
    ? chordsPerBar(beats, opts.chord.root, opts.chord.quality)
    : []

  const keyName = KEY_NAMES[pitchClass(rootPc)]
  const patternLabel = SCALE_PATTERN_LABEL[pattern]
  const chordSuffix = opts.chord ? ` over ${chordLabel(opts.chord.root, opts.chord.quality)}` : ''
  const name = `${keyName} ${scale.name} — ${patternLabel}`
  const description = `Øvemønster: ${scale.name.toLowerCase()} ${patternLabel}, to oktaver${chordSuffix}.`

  return {
    name,
    description,
    category: 'run',
    genre: 'jazz',
    difficulty: 2,
    original_key: pitchClass(rootPc),
    default_bpm: opts.bpm ?? 80,
    beats,
    time_signature: '4/4',
    notes: [...lh, ...notes],
    chords,
    tags: ['skala', scale.id, pattern],
    mode: scaleMode(scale),
    kind: 'scale',
  }
}

/**
 * «Hør skalaen over akkorden»: venstre hånd holder en shell-voicing av
 * akkorden per takt, høyre spiller skalaen opp og ned i åttedeler.
 */
export function scaleOverChordLick(
  rootPc: number,
  scale: ScaleDef,
  chord: ChordChoice,
  opts: { bpm?: number } = {},
): GeneratedLick {
  const pitches = scalePitches(rootPc, scale, 2, 60)
  const seq = upDown(pitches)
  const step = 0.5
  const notes = rightHand(seq, step, scale.intervals.length)
  const beats = Math.max(4, Math.ceil((seq.length * step) / 4) * 4)

  const lh = leftHand(beats, rootPc, chord)
  const chords = chordsPerBar(beats, chord.root, chord.quality)

  const keyName = KEY_NAMES[pitchClass(rootPc)]
  const chordName = chordLabel(chord.root, chord.quality)
  const name = `${keyName} ${scale.name} over ${chordName}`
  const description = `${scale.name} spilt opp og ned mens venstre hånd holder ${chordName}.`

  return {
    name,
    description,
    category: 'run',
    genre: 'jazz',
    difficulty: 2,
    original_key: pitchClass(rootPc),
    default_bpm: opts.bpm ?? 80,
    beats,
    time_signature: '4/4',
    notes: [...lh, ...notes],
    chords,
    tags: ['skala', scale.id, 'over-akkord'],
    mode: scaleMode(scale),
    kind: 'scale',
  }
}
