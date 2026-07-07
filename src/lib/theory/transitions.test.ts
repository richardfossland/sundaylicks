import { describe, expect, it } from 'vitest'

import { submissionSchema } from '../validation'
import type { Key } from './keys'
import { createSeededRng, generateTransition, tritoneSub, type TransitionOptions } from './transitions'

const C_MAJOR: Key = { root: 0, mode: 'major' }
const G_MAJOR: Key = { root: 7, mode: 'major' }

describe('tritoneSub', () => {
  it('tritone-subs G7 to Db7 (pitch class 1), quality kept', () => {
    expect(tritoneSub(7, '7')).toEqual({ root: 1, quality: '7' })
  })

  it('forces a dominant quality when subbing a non-dominant chord', () => {
    expect(tritoneSub(0, 'maj7')).toEqual({ root: 6, quality: '7' })
  })
})

describe('createSeededRng', () => {
  it('is deterministic: same seed produces the same sequence', () => {
    const a = createSeededRng('abc')
    const b = createSeededRng('abc')
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('different seeds produce different sequences', () => {
    const a = createSeededRng('abc')
    const b = createSeededRng('xyz')
    expect(a()).not.toBe(b())
  })
})

describe('generateTransition — validity', () => {
  const cases: TransitionOptions[] = [
    { from: { key: C_MAJOR }, to: { key: G_MAJOR }, device: 'modulate', seed: 1 },
    { from: { key: C_MAJOR }, to: { key: C_MAJOR }, device: 'wander', seed: 2 },
    { from: { key: C_MAJOR, chord: { t: 0, d: 4, r: 7, q: '7' } }, to: { key: C_MAJOR }, device: 'reharm', seed: 3 },
    {
      from: { key: C_MAJOR, chord: { t: 0, d: 4, r: 0, q: '7' } },
      to: { key: C_MAJOR, chord: { t: 0, d: 4, r: 5, q: '7' } },
      device: 'bass-walk',
      seed: 4,
    },
  ]

  it('every device returns 3 ranked results whose licks validate against lickContent', () => {
    for (const opts of cases) {
      const results = generateTransition(opts)
      expect(results).toHaveLength(3)
      expect(results.map((r) => r.level)).toEqual(['simple', 'intermediate', 'advanced'])
      for (const r of results) {
        const parsed = submissionSchema.safeParse(r.lick)
        if (!parsed.success) {
          throw new Error(`${opts.device}/${r.level} invalid: ${JSON.stringify(parsed.error.issues)}`)
        }
        expect(parsed.success).toBe(true)
        expect(r.lick.notes.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('generateTransition — determinism', () => {
  it('the same seed reproduces byte-identical output', () => {
    const opts: TransitionOptions = { from: { key: C_MAJOR }, to: { key: G_MAJOR }, device: 'modulate', seed: 'fixed-seed' }
    const a = generateTransition(opts)
    const b = generateTransition(opts)
    expect(a).toEqual(b)
  })

  it('different seeds produce different output', () => {
    const base = { from: { key: C_MAJOR }, to: { key: C_MAJOR }, device: 'wander' as const }
    const a = generateTransition({ ...base, seed: 'seed-a' })
    const b = generateTransition({ ...base, seed: 'seed-b' })
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b))
  })
})

describe('generateTransition — modulate', () => {
  it('the simple pivot-chord variant bridges through a chord common to both keys', () => {
    const [simple] = generateTransition({ from: { key: C_MAJOR }, to: { key: G_MAJOR }, device: 'modulate', seed: 5 })
    const bridge = simple.lick.chords[1]
    // C major → G major pivots are C(0), Em(4), Am(9) — all maj7/m7.
    expect([0, 4, 9]).toContain(bridge.r)
  })

  it('ends on the target key tonic', () => {
    const [simple] = generateTransition({ from: { key: C_MAJOR }, to: { key: G_MAJOR }, device: 'modulate', seed: 5 })
    const last = simple.lick.chords[simple.lick.chords.length - 1]
    expect(last).toMatchObject({ r: 7, q: 'maj7' })
  })
})

describe('generateTransition — wander', () => {
  it('the simple variant is a I–vi–ii–V turnaround in the given key', () => {
    const [simple] = generateTransition({ from: { key: C_MAJOR }, to: { key: C_MAJOR }, device: 'wander', seed: 6 })
    expect(simple.lick.chords.map((c) => ({ r: c.r, q: c.q }))).toEqual([
      { r: 0, q: 'maj7' },
      { r: 9, q: 'm7' },
      { r: 2, q: 'm7' },
      { r: 7, q: '7' },
    ])
    expect(simple.lick.category).toBe('turnaround')
  })
})

describe('generateTransition — reharm', () => {
  it('offers the original, then a tritone sub for a dominant chord, then a diminished approach', () => {
    const results = generateTransition({
      from: { key: C_MAJOR, chord: { t: 0, d: 4, r: 7, q: '7' } },
      to: { key: C_MAJOR },
      device: 'reharm',
      seed: 7,
    })
    expect(results[0].lick.chords[0]).toMatchObject({ r: 7, q: '7' })
    expect(results[1].label).toBe('Tritonussubstitusjon')
    expect(results[1].lick.chords[0]).toMatchObject({ r: 1, q: '7' })
    expect(results[2].lick.chords.at(-1)).toMatchObject({ r: 7, q: '7' })
  })
})

describe('generateTransition — bass-walk', () => {
  it('the chromatic variant walks the LH bass stepwise from C to F', () => {
    const [simple] = generateTransition({
      from: { key: C_MAJOR, chord: { t: 0, d: 4, r: 0, q: '7' } },
      to: { key: C_MAJOR, chord: { t: 0, d: 4, r: 5, q: '7' } },
      device: 'bass-walk',
      seed: 8,
    })
    const bassPitches = simple.lick.notes.filter((n) => n.h === 'L').map((n) => n.p)
    expect(bassPitches).toEqual([36, 37, 38, 39, 40, 41])
    expect(simple.lick.beats).toBe(6)
  })
})
