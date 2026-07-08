import { describe, expect, it } from 'vitest'

import { submissionSchema } from '@/lib/validation'
import type { Key } from '@/lib/theory/keys'
import { generateTransition } from '@/lib/theory/transitions'
import {
  DEVICES_FOR_MODE,
  chordOptionsFor,
  defaultDeviceFor,
  generatedToLick,
  needsFromChord,
  needsToChord,
  parseChordOption,
  resolveChordOption,
  resolveDevice,
} from './adapter'

const C_MAJOR: Key = { root: 0, mode: 'major' }
const G_MAJOR: Key = { root: 7, mode: 'major' }

describe('generatedToLick', () => {
  it('produces a Lick that validates against the shared content schema', () => {
    const [result] = generateTransition({ from: { key: C_MAJOR }, to: { key: G_MAJOR }, device: 'modulate', seed: 1 })
    const lick = generatedToLick(result.lick)
    expect(lick.status).toBe('published')
    expect(lick.kind).toBe('transition')
    expect(lick.id).toMatch(/^gen_/)
    expect(lick.slug).toMatch(/^gen-/)
    const parsed = submissionSchema.safeParse(lick)
    expect(parsed.success).toBe(true)
  })

  it('is deterministic: identical content -> identical id/slug (so re-favoriting de-dupes)', () => {
    const [a] = generateTransition({ from: { key: C_MAJOR }, to: { key: G_MAJOR }, device: 'modulate', seed: 1 })
    const [b] = generateTransition({ from: { key: C_MAJOR }, to: { key: G_MAJOR }, device: 'modulate', seed: 1 })
    expect(generatedToLick(a.lick).id).toBe(generatedToLick(b.lick).id)
    expect(generatedToLick(a.lick).slug).toBe(generatedToLick(b.lick).slug)
  })

  it('gives each of the 3 ranked variants a distinct id', () => {
    const results = generateTransition({ from: { key: C_MAJOR }, to: { key: G_MAJOR }, device: 'modulate', seed: 1 })
    const ids = results.map((r) => generatedToLick(r.lick).id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('preserves a kind the generator already set, instead of overriding it', () => {
    const [result] = generateTransition({ from: { key: C_MAJOR }, to: { key: G_MAJOR }, device: 'modulate', seed: 1 })
    const lick = generatedToLick({ ...result.lick, kind: 'custom-kind' })
    expect(lick.kind).toBe('custom-kind')
  })
})

describe('device selection', () => {
  it('wander mode offers wander/reharm/bass-walk, modulate offers modulate/bass-walk', () => {
    expect(DEVICES_FOR_MODE.wander).toEqual(['wander', 'reharm', 'bass-walk'])
    expect(DEVICES_FOR_MODE.modulate).toEqual(['modulate', 'bass-walk'])
  })

  it('defaults to the mode-appropriate device', () => {
    expect(defaultDeviceFor('wander')).toBe('wander')
    expect(defaultDeviceFor('modulate')).toBe('modulate')
  })

  it('resolves an out-of-mode device back to the default, keeps a valid one', () => {
    expect(resolveDevice('wander', 'modulate')).toBe('wander')
    expect(resolveDevice('modulate', 'reharm')).toBe('modulate')
    expect(resolveDevice('modulate', 'bass-walk')).toBe('bass-walk')
    expect(resolveDevice('wander', 'reharm')).toBe('reharm')
  })

  it('only reharm/bass-walk need chord pickers', () => {
    expect(needsFromChord('wander')).toBe(false)
    expect(needsFromChord('modulate')).toBe(false)
    expect(needsFromChord('reharm')).toBe(true)
    expect(needsFromChord('bass-walk')).toBe(true)

    expect(needsToChord('wander')).toBe(false)
    expect(needsToChord('reharm')).toBe(false)
    expect(needsToChord('modulate')).toBe(false)
    expect(needsToChord('bass-walk')).toBe(true)
  })
})

describe('chordOptionsFor / parseChordOption / resolveChordOption', () => {
  it('returns the 7 diatonic chords of a major key', () => {
    const options = chordOptionsFor(C_MAJOR)
    expect(options).toHaveLength(7)
    expect(options[0]).toMatchObject({ root: 0, quality: 'maj7' })
    expect(options[4]).toMatchObject({ root: 7, quality: '7' }) // V, harmonic-minor style dominant even in major
  })

  it('round-trips a chord value', () => {
    const options = chordOptionsFor(C_MAJOR)
    const parsed = parseChordOption(options[4].value)
    expect(parsed).toEqual({ root: options[4].root, quality: options[4].quality })
  })

  it('resolveChordOption keeps a still-valid selection', () => {
    const options = chordOptionsFor(C_MAJOR)
    const picked = resolveChordOption(options[2].value, options, 0)
    expect(picked).toEqual(options[2])
  })

  it('resolveChordOption falls back when the value is missing or stale (key changed)', () => {
    const cOptions = chordOptionsFor(C_MAJOR)
    const gOptions = chordOptionsFor(G_MAJOR)
    // A value from C major's option set doesn't exist in G major's.
    const picked = resolveChordOption(cOptions[2].value, gOptions, 0)
    expect(picked).toEqual(gOptions[0])
    expect(resolveChordOption(null, gOptions, 4)).toEqual(gOptions[4])
  })
})
