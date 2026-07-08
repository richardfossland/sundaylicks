// ── /transitions — pure flow logic ───────────────────────────────────────────
//
// Turns a theory-engine `GeneratedLick` into a full, in-memory `Lick` the
// existing Practice/collections components can consume unmodified, plus the
// small bits of UI logic (which devices a mode offers, chord-picker options)
// worth covering with plain vitest unit tests. Defined LOCALLY for this
// workstream (E) — not shared with workstream D's /spice flow, per PLAN.

import { chordLabel } from '@/lib/music'
import { diatonicChords, type Key } from '@/lib/theory/keys'
import type { GeneratedLick, TransitionDevice } from '@/lib/theory/transitions'
import type { Lick } from '@/types/lick'

// ── Lick adapter ─────────────────────────────────────────────────────────

function slugify(s: string): string {
  const base = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents (after NFD decomposition)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'overgang'
}

/** Small deterministic string hash (FNV-1a) — same content → same id/slug. */
function fnv1a(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

/**
 * Turn a `generateTransition` result's musical content into a full, never-
 * persisted `Lick` — synthetic id/slug, `status: 'published'`,
 * `kind: 'transition'` — so it feeds Practice/FavoriteButton-style collection
 * logic exactly like a library lick, without a DB round-trip. Deterministic:
 * identical content always produces the identical id/slug, so favoriting the
 * same generated variant twice de-dupes instead of creating a duplicate.
 */
export function generatedToLick(g: GeneratedLick): Lick {
  const hash = fnv1a(JSON.stringify({ n: g.name, c: g.chords, bpm: g.default_bpm, k: g.original_key }))
  return {
    ...g,
    id: `gen_${hash}`,
    slug: `gen-${slugify(g.name)}-${hash}`,
    status: 'published',
    submitted_by: null,
    kind: g.kind ?? 'transition',
  }
}

// ── Flow / device selection ─────────────────────────────────────────────

export type FlowMode = 'wander' | 'modulate'

/** Devices offered per mode, in display order — index 0 is the mode's default. */
export const DEVICES_FOR_MODE: Record<FlowMode, TransitionDevice[]> = {
  wander: ['wander', 'reharm', 'bass-walk'],
  modulate: ['modulate', 'bass-walk'],
}

export function defaultDeviceFor(mode: FlowMode): TransitionDevice {
  return DEVICES_FOR_MODE[mode][0]
}

/** Keeps `device` valid when the mode changes — falls back to the new mode's default. */
export function resolveDevice(mode: FlowMode, device: TransitionDevice): TransitionDevice {
  return DEVICES_FOR_MODE[mode].includes(device) ? device : defaultDeviceFor(mode)
}

/** Whether this device needs an explicit "fra"-chord picker (reharm/bass-walk). */
export function needsFromChord(device: TransitionDevice): boolean {
  return device === 'reharm' || device === 'bass-walk'
}

/** Whether this device needs an explicit "til"-chord picker (bass-walk only). */
export function needsToChord(device: TransitionDevice): boolean {
  return device === 'bass-walk'
}

// ── Chord-picker options ────────────────────────────────────────────────

export interface ChordOption {
  value: string
  root: number
  quality: string
  label: string
}

/** The 7 diatonic chords of a key as chord-picker options (harmonic-minor V/vii for minor keys). */
export function chordOptionsFor(key: Key): ChordOption[] {
  return diatonicChords(key, { harmonic: true }).map((c) => ({
    value: `${c.degree}|${c.root}|${c.quality}`,
    root: c.root,
    quality: c.quality,
    label: `${c.roman} ${chordLabel(c.root, c.quality)}`,
  }))
}

/** Recover {root, quality} from a `ChordOption.value` produced by `chordOptionsFor`. */
export function parseChordOption(value: string): { root: number; quality: string } {
  const [, root, quality] = value.split('|')
  return { root: Number(root), quality }
}

/**
 * Pick a chord option by value if it still belongs to `options` (the key may
 * have changed since the user picked), otherwise fall back to a sensible
 * default index.
 */
export function resolveChordOption(value: string | null, options: ChordOption[], fallbackIndex: number): ChordOption | undefined {
  if (value) {
    const found = options.find((o) => o.value === value)
    if (found) return found
  }
  return options[fallbackIndex] ?? options[0]
}
