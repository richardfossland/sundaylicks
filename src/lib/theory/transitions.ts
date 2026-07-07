// ── Transition generator (pure, no audio, no DB) ─────────────────────────────
//
// Produces playable `Lick`-shaped content (MIDI notes + chord symbols) that
// moves from one key/chord to another using a named harmonic device. Every
// device returns a handful of `TransitionResult`s ranked simple → advanced,
// so callers (UI / backfill) can pick a difficulty.
//
// Determinism: nothing here calls Math.random(). A tiny seedable PRNG
// (mulberry32, seeded via a string/number hash) drives the only "creative"
// choices — humanized velocities and the default tempo — so the same
// `seed` always reproduces byte-identical output.

import type { Category, Difficulty, Genre, Hand, Lick, LickChord, LickNote } from '@/types/lick'
import { NOTE_NAMES, pitchClass } from '../music'
import { nearestOffset } from '../transpose'
import { chordAtDegree, pivotChords, type Key } from './keys'
import { voicing } from './voicings'

export type TransitionDevice = 'modulate' | 'wander' | 'reharm' | 'bass-walk'
export type TransitionLevel = 'simple' | 'intermediate' | 'advanced'

export interface TransitionEndpoint {
  key: Key
  chord?: LickChord
}

export interface TransitionOptions {
  from: TransitionEndpoint
  to: TransitionEndpoint
  device: TransitionDevice
  bpm?: number
  genre?: Genre
  /** Any string or number reproduces the same output; omit for a fixed default seed. */
  seed?: number | string
}

/** A generated lick's musical content — no DB-owned fields (id/slug/status/...). */
export type GeneratedLick = Omit<Lick, 'id' | 'slug' | 'status' | 'submitted_by' | 'created_at'>

export interface TransitionResult {
  device: TransitionDevice
  level: TransitionLevel
  label: string
  lick: GeneratedLick
}

// ── Seeded PRNG ──────────────────────────────────────────────────────────────

/** Hash an arbitrary seed (string/number/undefined) down to a 32-bit int. */
function hashSeed(seed: number | string | undefined): number {
  if (seed === undefined) return 0x9e3779b9
  if (typeof seed === 'number') return seed >>> 0
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32 — small, fast, deterministic PRNG returning floats in [0, 1). */
function mulberry32(a: number): () => number {
  let state = a >>> 0
  return function next() {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A fresh seeded RNG for `seed` — same input always yields the same sequence. */
export function createSeededRng(seed: number | string | undefined): () => number {
  return mulberry32(hashSeed(seed))
}

// ── Shared lick-building helpers ────────────────────────────────────────────

interface Segment {
  root: number // pitch class 0–11
  quality: string
  beats: number
}

function keyName(key: Key): string {
  return NOTE_NAMES[pitchClass(key.root)] + (key.mode === 'minor' ? 'm' : '')
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Deterministic per-note velocity, gently varied around a comping-appropriate mean. */
function humanizedVelocity(rng: () => number): number {
  return round2(0.66 + rng() * 0.22)
}

function chordNotes(root: number, quality: string, hand: Hand, t: number, d: number, octaveShift: number, rng: () => number): LickNote[] {
  const style = hand === 'L' ? 'shell' : 'close'
  return voicing(root, quality, style).map((p) => ({
    p: p + octaveShift,
    t,
    d,
    h: hand,
    v: humanizedVelocity(rng),
  }))
}

interface BuildLickOpts {
  segments: Segment[]
  name: string
  description: string
  category: Category
  genre: Genre
  difficulty: Difficulty
  originalKey: number
  bpm?: number
  tags: string[]
  rng: () => number
}

function buildLickFromProgression(opts: BuildLickOpts): GeneratedLick {
  const beats = opts.segments.reduce((sum, s) => sum + s.beats, 0)
  const chords: LickChord[] = []
  const notes: LickNote[] = []

  let t = 0
  for (const seg of opts.segments) {
    chords.push({ t, d: seg.beats, r: seg.root, q: seg.quality })
    notes.push(...chordNotes(seg.root, seg.quality, 'L', t, seg.beats, 0, opts.rng))
    notes.push(...chordNotes(seg.root, seg.quality, 'R', t, seg.beats, 12, opts.rng))
    t += seg.beats
  }

  return {
    name: opts.name,
    description: opts.description,
    category: opts.category,
    genre: opts.genre,
    difficulty: opts.difficulty,
    original_key: pitchClass(opts.originalKey),
    default_bpm: opts.bpm ?? Math.round(84 + opts.rng() * 40),
    beats,
    time_signature: '4/4',
    notes,
    chords,
    tags: opts.tags,
  }
}

const LEVEL_DIFFICULTY: Record<TransitionLevel, Difficulty> = { simple: 1, intermediate: 2, advanced: 3 }

// ── Device: modulate (from.key !== to.key) ──────────────────────────────────

function secondaryDominantOf(targetRoot: number): { root: number; quality: string } {
  return { root: pitchClass(targetRoot + 7), quality: '7' }
}

function generateModulate(opts: TransitionOptions, rng: () => number): TransitionResult[] {
  const { from, to } = opts
  const genre = opts.genre ?? 'jazz'
  const fromTonic = chordAtDegree(from.key, 1)
  const toTonic = chordAtDegree(to.key, 1)
  const toII = chordAtDegree(to.key, 2)
  const toV = chordAtDegree(to.key, 5, { harmonic: true })
  const pivots = pivotChords(from.key, to.key)
  const label = `${keyName(from.key)} → ${keyName(to.key)}`

  const results: TransitionResult[] = []

  const bridge = pivots[0] ?? { root: toV.root, quality: toV.quality }
  results.push({
    device: 'modulate',
    level: 'simple',
    label: 'Pivotakkord-modulasjon',
    lick: buildLickFromProgression({
      segments: [
        { root: fromTonic.root, quality: fromTonic.quality, beats: 2 },
        { root: bridge.root, quality: bridge.quality, beats: 2 },
        { root: toTonic.root, quality: toTonic.quality, beats: 4 },
      ],
      name: `Modulasjon (pivot): ${label}`,
      description: `Pivotakkord-modulasjon fra ${keyName(from.key)} til ${keyName(to.key)}.`,
      category: 'run',
      genre,
      difficulty: LEVEL_DIFFICULTY.simple,
      originalKey: from.key.root,
      bpm: opts.bpm,
      tags: ['modulate', 'simple', 'pivot-chord'],
      rng,
    }),
  })

  results.push({
    device: 'modulate',
    level: 'intermediate',
    label: 'ii–V inn i ny toneart',
    lick: buildLickFromProgression({
      segments: [
        { root: fromTonic.root, quality: fromTonic.quality, beats: 2 },
        { root: toII.root, quality: toII.quality, beats: 2 },
        { root: toV.root, quality: toV.quality, beats: 2 },
        { root: toTonic.root, quality: toTonic.quality, beats: 2 },
      ],
      name: `Modulasjon (ii–V): ${label}`,
      description: `ii–V inn i ${keyName(to.key)}, fra ${keyName(from.key)}.`,
      category: 'run',
      genre,
      difficulty: LEVEL_DIFFICULTY.intermediate,
      originalKey: from.key.root,
      bpm: opts.bpm,
      tags: ['modulate', 'intermediate', 'ii-V'],
      rng,
    }),
  })

  const secDom = secondaryDominantOf(toV.root)
  results.push({
    device: 'modulate',
    level: 'advanced',
    label: 'Sekundærdominant-modulasjon',
    lick: buildLickFromProgression({
      segments: [
        { root: fromTonic.root, quality: fromTonic.quality, beats: 2 },
        { root: secDom.root, quality: secDom.quality, beats: 2 },
        { root: toV.root, quality: toV.quality, beats: 2 },
        { root: toTonic.root, quality: toTonic.quality, beats: 2 },
      ],
      name: `Modulasjon (sekundærdominant): ${label}`,
      description: `Sekundærdominant (V7/V) driver modulasjonen fra ${keyName(from.key)} til ${keyName(to.key)}.`,
      category: 'run',
      genre,
      difficulty: LEVEL_DIFFICULTY.advanced,
      originalKey: from.key.root,
      bpm: opts.bpm,
      tags: ['modulate', 'advanced', 'secondary-dominant'],
      rng,
    }),
  })

  return results
}

// ── Device: wander (from.key === to.key) ────────────────────────────────────

function generateWander(opts: TransitionOptions, rng: () => number): TransitionResult[] {
  const key = opts.from.key
  const genre = opts.genre ?? 'gospel'
  const tonic = chordAtDegree(key, 1)
  const vi = chordAtDegree(key, 6)
  const ii = chordAtDegree(key, 2)
  const V = chordAtDegree(key, 5, { harmonic: true })
  const label = keyName(key)

  const results: TransitionResult[] = []

  results.push({
    device: 'wander',
    level: 'simple',
    label: 'I–vi–ii–V turnaround',
    lick: buildLickFromProgression({
      segments: [
        { root: tonic.root, quality: tonic.quality, beats: 2 },
        { root: vi.root, quality: vi.quality, beats: 2 },
        { root: ii.root, quality: ii.quality, beats: 2 },
        { root: V.root, quality: V.quality, beats: 2 },
      ],
      name: `Turnaround: I–vi–ii–V i ${label}`,
      description: `Klassisk turnaround i ${label}, klar til å løse tilbake til I.`,
      category: 'turnaround',
      genre,
      difficulty: LEVEL_DIFFICULTY.simple,
      originalKey: key.root,
      bpm: opts.bpm,
      tags: ['wander', 'simple', 'turnaround'],
      rng,
    }),
  })

  const secDomOfII = secondaryDominantOf(ii.root)
  results.push({
    device: 'wander',
    level: 'intermediate',
    label: 'I–V7/ii–ii–V turnaround',
    lick: buildLickFromProgression({
      segments: [
        { root: tonic.root, quality: tonic.quality, beats: 2 },
        { root: secDomOfII.root, quality: secDomOfII.quality, beats: 2 },
        { root: ii.root, quality: ii.quality, beats: 2 },
        { root: V.root, quality: V.quality, beats: 2 },
      ],
      name: `Turnaround med sekundærdominant i ${label}`,
      description: `I–V7/ii–ii–V: sekundærdominant erstatter vi for sterkere trekk mot ii.`,
      category: 'turnaround',
      genre,
      difficulty: LEVEL_DIFFICULTY.intermediate,
      originalKey: key.root,
      bpm: opts.bpm,
      tags: ['wander', 'intermediate', 'secondary-dominant'],
      rng,
    }),
  })

  // Passing diminished a half-step above the tonic, resolving up into ii.
  const passingDim = { root: pitchClass(tonic.root + 1), quality: 'dim7' }
  results.push({
    device: 'wander',
    level: 'advanced',
    label: 'I–#Idim7–ii–V turnaround',
    lick: buildLickFromProgression({
      segments: [
        { root: tonic.root, quality: tonic.quality, beats: 2 },
        { root: passingDim.root, quality: passingDim.quality, beats: 2 },
        { root: ii.root, quality: ii.quality, beats: 2 },
        { root: V.root, quality: V.quality, beats: 2 },
      ],
      name: `Turnaround med gjennomgangsakkord i ${label}`,
      description: `Kromatisk diminished-gjennomgang (#I°7) mellom I og ii, løser tilbake til V.`,
      category: 'turnaround',
      genre,
      difficulty: LEVEL_DIFFICULTY.advanced,
      originalKey: key.root,
      bpm: opts.bpm,
      tags: ['wander', 'advanced', 'passing-diminished'],
      rng,
    }),
  })

  return results
}

// ── Device: reharm (single chord) ───────────────────────────────────────────

function isDominant(quality: string): boolean {
  return quality.includes('7') && !quality.startsWith('maj') && !quality.startsWith('m')
}

/** Tritone substitution: root moves a tritone (6 semitones), dominant quality kept. */
export function tritoneSub(root: number, quality: string): { root: number; quality: string } {
  return { root: pitchClass(root + 6), quality: isDominant(quality) ? quality : '7' }
}

function relativeSub(root: number, quality: string): { root: number; quality: string } {
  const isMinorish = quality.startsWith('m') && !quality.startsWith('maj')
  return isMinorish ? { root: pitchClass(root + 3), quality: 'maj7' } : { root: pitchClass(root + 9), quality: 'm7' }
}

function generateReharm(opts: TransitionOptions, rng: () => number): TransitionResult[] {
  const genre = opts.genre ?? 'jazz'
  const chord = opts.from.chord ?? { t: 0, d: 4, r: opts.from.key.root, q: opts.from.key.mode === 'major' ? 'maj7' : 'm7' }
  const beats = chord.d > 0 ? chord.d : 4
  const original = { root: chord.r, quality: chord.q }
  const origLabel = NOTE_NAMES[pitchClass(original.root)] + original.quality

  const results: TransitionResult[] = []

  results.push({
    device: 'reharm',
    level: 'simple',
    label: 'Original',
    lick: buildLickFromProgression({
      segments: [{ root: original.root, quality: original.quality, beats }],
      name: `Reharm — original: ${origLabel}`,
      description: `Utgangsakkorden ${origLabel}, som referanse for substitusjonene.`,
      category: 'comp',
      genre,
      difficulty: LEVEL_DIFFICULTY.simple,
      originalKey: opts.from.key.root,
      bpm: opts.bpm,
      tags: ['reharm', 'simple', 'original'],
      rng,
    }),
  })

  const sub2 = isDominant(original.quality) ? tritoneSub(original.root, original.quality) : relativeSub(original.root, original.quality)
  const sub2Label = isDominant(original.quality) ? 'Tritonussubstitusjon' : 'Relativ substitusjon'
  results.push({
    device: 'reharm',
    level: 'intermediate',
    label: sub2Label,
    lick: buildLickFromProgression({
      segments: [{ root: sub2.root, quality: sub2.quality, beats }],
      name: `Reharm (${sub2Label.toLowerCase()}): ${origLabel} → ${NOTE_NAMES[pitchClass(sub2.root)] + sub2.quality}`,
      description: `${sub2Label} av ${origLabel}.`,
      category: 'comp',
      genre,
      difficulty: LEVEL_DIFFICULTY.intermediate,
      originalKey: opts.from.key.root,
      bpm: opts.bpm,
      tags: ['reharm', 'intermediate', isDominant(original.quality) ? 'tritone-sub' : 'relative-sub'],
      rng,
    }),
  })

  // Chromatic (diminished) approach: a dim7 a half-step below, resolving into the original.
  const approachBeats = beats / 2
  const approach = { root: pitchClass(original.root - 1), quality: 'dim7' }
  results.push({
    device: 'reharm',
    level: 'advanced',
    label: 'Kromatisk approach (dim7)',
    lick: buildLickFromProgression({
      segments: [
        { root: approach.root, quality: approach.quality, beats: approachBeats },
        { root: original.root, quality: original.quality, beats: beats - approachBeats },
      ],
      name: `Reharm (dim-approach) → ${origLabel}`,
      description: `Diminished-akkord et halvtrinn under løser inn i ${origLabel}.`,
      category: 'comp',
      genre,
      difficulty: LEVEL_DIFFICULTY.advanced,
      originalKey: opts.from.key.root,
      bpm: opts.bpm,
      tags: ['reharm', 'advanced', 'diminished-approach'],
      rng,
    }),
  })

  return results
}

// ── Device: bass-walk ────────────────────────────────────────────────────────

function chromaticBassPath(fromRoot: number, toRoot: number): number[] {
  const offset = nearestOffset(fromRoot, toRoot)
  if (offset === 0) return [pitchClass(fromRoot)]
  const direction = offset > 0 ? 1 : -1
  const steps = Math.abs(offset)
  const path: number[] = []
  for (let i = 0; i <= steps; i++) path.push(pitchClass(fromRoot + i * direction))
  return path
}

function scaleFor(key: Key): number[] {
  const steps = key.mode === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10]
  return steps.map((s) => pitchClass(key.root + s))
}

function diatonicBassPath(key: Key, fromRoot: number, toRoot: number): number[] {
  const chromatic = chromaticBassPath(fromRoot, toRoot)
  const scale = new Set(scaleFor(key))
  const filtered = chromatic.filter((pc, i) => i === 0 || i === chromatic.length - 1 || scale.has(pc))
  return filtered.length >= 2 ? filtered : chromatic
}

/** Realize a pitch-class path as a smoothly voice-led MIDI bass line. */
function realizeBassLine(pitchClasses: number[], startMidi: number): number[] {
  const out = [startMidi]
  let prev = startMidi
  for (let i = 1; i < pitchClasses.length; i++) {
    const next = prev + nearestOffset(pitchClass(prev), pitchClasses[i])
    out.push(next)
    prev = next
  }
  return out
}

function bassStartMidi(root: number): number {
  return 36 + nearestOffset(0, root) // ~C2 register
}

function generateBassWalk(opts: TransitionOptions, rng: () => number): TransitionResult[] {
  const genre = opts.genre ?? 'blues'
  const fromChord = opts.from.chord ?? { t: 0, d: 4, r: opts.from.key.root, q: opts.from.key.mode === 'major' ? 'maj7' : 'm7' }
  const toChord = opts.to.chord ?? { t: 0, d: 4, r: opts.to.key.root, q: opts.to.key.mode === 'major' ? 'maj7' : 'm7' }
  const fromRoot = fromChord.r
  const toRoot = toChord.r
  const label = `${NOTE_NAMES[pitchClass(fromRoot)]}${fromChord.q} → ${NOTE_NAMES[pitchClass(toRoot)]}${toChord.q}`

  function buildWalk(path: number[], levelLabel: string, level: TransitionLevel, tags: string[]): TransitionResult {
    const bassLine = realizeBassLine(path, bassStartMidi(fromRoot))
    const beats = bassLine.length
    const chords: LickChord[] = [
      { t: 0, d: Math.max(beats - 1, 1), r: fromRoot, q: fromChord.q },
      { t: Math.max(beats - 1, 1), d: 1, r: toRoot, q: toChord.q },
    ]
    const notes: LickNote[] = []
    bassLine.forEach((p, i) => {
      notes.push({ p, t: i, d: 1, h: 'L', v: humanizedVelocity(rng) })
    })
    notes.push(
      ...voicing(fromRoot, fromChord.q, 'close').map((p) => ({
        p: p + 12,
        t: 0,
        d: Math.max(beats - 1, 1),
        h: 'R' as Hand,
        v: humanizedVelocity(rng),
      })),
    )
    notes.push(
      ...voicing(toRoot, toChord.q, 'close').map((p) => ({
        p: p + 12,
        t: Math.max(beats - 1, 1),
        d: 1,
        h: 'R' as Hand,
        v: humanizedVelocity(rng),
      })),
    )

    return {
      device: 'bass-walk',
      level,
      label: levelLabel,
      lick: {
        name: `Gående bass (${levelLabel.toLowerCase()}): ${label}`,
        description: `Gående bass fra ${NOTE_NAMES[pitchClass(fromRoot)]} til ${NOTE_NAMES[pitchClass(toRoot)]} — ${levelLabel.toLowerCase()}.`,
        category: 'groove',
        genre,
        difficulty: LEVEL_DIFFICULTY[level],
        original_key: pitchClass(fromRoot),
        default_bpm: opts.bpm ?? Math.round(84 + rng() * 40),
        beats,
        time_signature: '4/4',
        notes,
        chords,
        tags: ['bass-walk', level, ...tags],
      },
    }
  }

  const chromaticPath = chromaticBassPath(fromRoot, toRoot)
  const diatonicPath = diatonicBassPath(opts.from.key, fromRoot, toRoot)
  const approachPath = [...diatonicPath]
  if (approachPath.length >= 2) {
    approachPath[approachPath.length - 2] = pitchClass(toRoot - 1)
  }

  return [
    buildWalk(chromaticPath, 'Kromatisk gange', 'simple', ['chromatic']),
    buildWalk(diatonicPath, 'Skalabasert gange', 'intermediate', ['diatonic']),
    buildWalk(approachPath, 'Gange med kromatisk approach', 'advanced', ['approach-note']),
  ]
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate ranked (simple → advanced) transition variations for a device.
 * Deterministic: identical `opts` (including `seed`) always returns identical
 * output; every generated lick validates against `lickContent`
 * (see src/lib/validation.ts).
 */
export function generateTransition(opts: TransitionOptions): TransitionResult[] {
  const rng = createSeededRng(opts.seed)
  switch (opts.device) {
    case 'modulate':
      return generateModulate(opts, rng)
    case 'wander':
      return generateWander(opts, rng)
    case 'reharm':
      return generateReharm(opts, rng)
    case 'bass-walk':
      return generateBassWalk(opts, rng)
    default: {
      const exhaustive: never = opts.device
      throw new Error(`Unknown transition device: ${String(exhaustive)}`)
    }
  }
}
