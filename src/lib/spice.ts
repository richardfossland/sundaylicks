// ── "Spice up i min toneart" — pure logic (no audio, no DB) ─────────────────
//
// Workstream D. Everything here composes the theory engine
// (src/lib/theory/*) with the library (src/lib/licks.ts) to power the
// /spice page: re-projecting library licks into the player's current key,
// suggesting library fills + generated reharm/voicings over a chosen chord,
// and a lightweight per-chord "spice" pass over a hand-built progression.
//
// The `generatedToLick` adapter is intentionally local to this file (not
// shared with workstream E) — see PLAN for /spice.

import type { Category, Difficulty, Genre, Lick, LickChord, LickNote } from '@/types/lick'
import { chordLabel, pitchClass } from './music'
import { analyzeLick } from './theory/analyze'
import type { Key } from './theory/keys'
import { generateTransition, type GeneratedLick, type TransitionLevel, type TransitionResult } from './theory/transitions'
import { voicing, type VoicingStyle } from './theory/voicings'

// ── Generated → Lick adapter ────────────────────────────────────────────────

let genCounter = 0

/**
 * Turn a `GeneratedLick` (musical content only) into a playable, saveable
 * `Lick` by synthesising the DB-owned fields. Every call produces a fresh,
 * stable `id` — safe to use as a React key and as the favorites/list
 * identity (see `collections.ts`'s `CollectionRef`).
 */
export function generatedToLick(g: GeneratedLick, idPrefix = 'generated'): Lick {
  genCounter += 1
  const rand = Math.random().toString(36).slice(2, 8)
  const id = `${idPrefix}-${genCounter}-${rand}`
  return {
    ...g,
    id,
    slug: `generated-${id}`,
    status: 'published',
    kind: 'transition',
  }
}

// ── "Din toneart" — library licks grouped into spice categories ────────────

export interface SpiceGroup {
  category: Category
  label: string
  items: Lick[]
}

interface SpiceGroupDef {
  category: Category
  label: string
  /** harmonic_function tags that also qualify a lick for this group, even if
   * its own `category` differs (used only when `harmonic_function` is set —
   * see `matchesGroup`). */
  functionTags: string[]
}

const SPICE_GROUP_DEFS: SpiceGroupDef[] = [
  { category: 'fill', label: 'Fills', functionTags: ['fill', 'fill-over-I'] },
  { category: 'turnaround', label: 'Turnarounds', functionTags: ['turnaround'] },
  { category: 'two-five-one', label: '2-5-1', functionTags: ['ii-V', 'ii-V-I'] },
  { category: 'run', label: 'Runs', functionTags: [] },
]

/** Is `quality` minor-ish (m, m7, m9, m7b5, dim… — anything but maj/dominant/major)? */
export function isMinorishQuality(quality: string): boolean {
  return quality.startsWith('m') && !quality.startsWith('maj')
}

/** Does a lick's tonality agree with `mode`? Prefers the declared `mode` field
 * (set by backfill B for some licks), falls back to the chord-based heuristic
 * in `analyzeLick` for the rest. */
export function lickTonalityMatches(lick: Lick, mode: Key['mode']): boolean {
  if (lick.mode) return lick.mode === mode
  return analyzeLick(lick).tonality === mode
}

function matchesGroup(lick: Lick, def: SpiceGroupDef): boolean {
  if (lick.harmonic_function && lick.harmonic_function.length > 0) {
    return lick.harmonic_function.some((f) => def.functionTags.includes(f)) || lick.category === def.category
  }
  return lick.category === def.category
}

export interface SpiceFilters {
  genre?: Genre | 'all'
  difficulty?: Difficulty | 'all'
}

/**
 * Group published licks into the "spice" categories (fills, turnarounds,
 * 2-5-1s, runs), keeping only ones tonally consistent with `key.mode` and
 * matching the optional genre/difficulty filters. Empty groups are dropped.
 * Callers re-project the results into `key` via `LickCard`'s `targetKey` —
 * this function only selects/orders, it never transposes.
 */
export function spiceGroupsForKey(licks: Lick[], key: Key, filters: SpiceFilters = {}, limit = 6): SpiceGroup[] {
  const genre = filters.genre ?? 'all'
  const difficulty = filters.difficulty ?? 'all'
  return SPICE_GROUP_DEFS.map((def) => ({
    category: def.category,
    label: def.label,
    items: licks
      .filter(
        (l) =>
          matchesGroup(l, def) &&
          lickTonalityMatches(l, key.mode) &&
          (genre === 'all' || l.genre === genre) &&
          (difficulty === 'all' || l.difficulty === difficulty),
      )
      .slice(0, limit),
  })).filter((g) => g.items.length > 0)
}

// ── "Over denne akkorden" — library fills ───────────────────────────────────

/** Library fills whose tonality matches the chosen root/quality — displayed
 * transposed onto that root via `LickCard`'s `targetKey`. */
export function fillsForChord(licks: Lick[], root: number, quality: string, genre: Genre | 'all' = 'all', limit = 6): Lick[] {
  const mode: Key['mode'] = isMinorishQuality(quality) ? 'minor' : 'major'
  return licks
    .filter((l) => l.category === 'fill')
    .filter((l) => lickTonalityMatches(l, mode))
    .filter((l) => genre === 'all' || l.genre === genre)
    .slice(0, limit)
    .map((l) => ({ ...l }))
}

// ── "Over denne akkorden" — generated reharm ────────────────────────────────

/** Ranked simple → advanced order, used to cap results at a chosen "spice" level. */
export const LEVEL_ORDER: TransitionLevel[] = ['simple', 'intermediate', 'advanced']

/** Reharm suggestions for a single chord, capped to everything at or below `level`. */
export function reharmSuggestions(
  key: Key,
  root: number,
  quality: string,
  level: TransitionLevel,
  genre: Genre,
  seed?: number | string,
): TransitionResult[] {
  const maxIdx = LEVEL_ORDER.indexOf(level)
  const results = generateTransition({
    from: { key, chord: { t: 0, d: 4, r: pitchClass(root), q: quality } },
    to: { key },
    device: 'reharm',
    genre,
    seed,
  })
  return results.filter((r) => LEVEL_ORDER.indexOf(r.level) <= maxIdx)
}

// ── "Over denne akkorden" — generated voicings ──────────────────────────────

const VOICING_STYLES_BY_LEVEL: Record<TransitionLevel, VoicingStyle[]> = {
  simple: ['close', 'shell'],
  intermediate: ['close', 'shell', 'rootless-a', 'rootless-b', 'drop2'],
  advanced: ['close', 'shell', 'rootless-a', 'rootless-b', 'drop2', 'quartal', 'gospel'],
}

/** Which voicing styles to offer at a given "hold it simple ↔ spice it up" level. */
export function voicingStylesForLevel(level: TransitionLevel): VoicingStyle[] {
  return VOICING_STYLES_BY_LEVEL[level]
}

export const VOICING_STYLE_LABEL: Record<VoicingStyle, string> = {
  close: 'Tett',
  'rootless-a': 'Rotløs A',
  'rootless-b': 'Rotløs B',
  gospel: 'Gospel-spread',
  quartal: 'Kvartal',
  shell: 'Shell',
  drop2: 'Drop-2',
}

const VOICING_STYLE_DIFFICULTY: Record<VoicingStyle, Difficulty> = {
  close: 1,
  shell: 1,
  'rootless-a': 2,
  'rootless-b': 2,
  drop2: 2,
  quartal: 3,
  gospel: 3,
}

/** A single sustained chord voiced in `style` — playable via `Practice`'s `lick` prop. */
export function voicingLick(
  root: number,
  quality: string,
  style: VoicingStyle,
  opts: { genre: Genre; bpm?: number; beats?: number },
): GeneratedLick {
  const beats = opts.beats ?? 4
  const label = chordLabel(root, quality)
  const notes: LickNote[] = voicing(root, quality, style).map((p) => ({ p, t: 0, d: beats, h: 'R', v: 0.75 }))
  const chords: LickChord[] = [{ t: 0, d: beats, r: pitchClass(root), q: quality }]
  return {
    name: `Voicing (${VOICING_STYLE_LABEL[style]}): ${label}`,
    description: `${VOICING_STYLE_LABEL[style]}-voicing over ${label}.`,
    category: 'comp',
    genre: opts.genre,
    difficulty: VOICING_STYLE_DIFFICULTY[style],
    original_key: pitchClass(root),
    default_bpm: opts.bpm ?? 84,
    beats,
    time_signature: '4/4',
    notes,
    chords,
    tags: ['spice', 'voicing', style],
  }
}

// ── Progression-aware spicing (section 3) ───────────────────────────────────

export interface ProgressionStep {
  root: number
  quality: string
  roman?: string
}

/** Lay a sequence of chord picks out on a beat grid — feeds `ChordStrip` directly. */
export function progressionToChords(steps: ProgressionStep[], beatsPerChord = 4): LickChord[] {
  return steps.map((s, i) => ({ t: i * beatsPerChord, d: beatsPerChord, r: pitchClass(s.root), q: s.quality }))
}

/** One voicing suggestion per step, using the most colourful style unlocked at `level`. */
export function spiceForProgression(
  steps: ProgressionStep[],
  opts: { genre: Genre; level: TransitionLevel; bpm?: number },
): GeneratedLick[] {
  const styles = voicingStylesForLevel(opts.level)
  const style = styles[styles.length - 1]
  return steps.map((s) => voicingLick(s.root, s.quality, style, { genre: opts.genre, bpm: opts.bpm }))
}
