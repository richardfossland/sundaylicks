import { describe, expect, it } from 'vitest'

import type { Lick } from '@/types/lick'
import { submissionSchema } from './validation'
import type { Key } from './theory/keys'
import {
  fillsForChord,
  generatedToLick,
  isMinorishQuality,
  LEVEL_ORDER,
  lickTonalityMatches,
  progressionToChords,
  reharmSuggestions,
  spiceForProgression,
  spiceGroupsForKey,
  voicingLick,
  voicingStylesForLevel,
} from './spice'

const C_MAJOR: Key = { root: 0, mode: 'major' }
const A_MINOR: Key = { root: 9, mode: 'minor' }

function lick(overrides: Partial<Lick>): Lick {
  return {
    id: overrides.id ?? 'id',
    slug: overrides.slug ?? 'slug',
    name: 'Test',
    description: null,
    category: 'fill',
    genre: 'jazz',
    difficulty: 1,
    original_key: 0,
    default_bpm: 90,
    beats: 4,
    time_signature: '4/4',
    notes: [{ p: 60, t: 0, d: 4, h: 'R' }],
    chords: [{ t: 0, d: 4, r: 0, q: 'maj7' }],
    tags: [],
    status: 'published',
    ...overrides,
  }
}

describe('generatedToLick', () => {
  it('synthesises id/slug/status/kind and keeps the musical content', () => {
    const g = voicingLick(0, 'maj7', 'close', { genre: 'jazz' })
    const l = generatedToLick(g)
    expect(l.status).toBe('published')
    expect(l.kind).toBe('transition')
    expect(l.slug).toMatch(/^generated-/)
    expect(l.id.length).toBeGreaterThan(0)
    expect(l.name).toBe(g.name)
    expect(l.notes).toEqual(g.notes)
  })

  it('produces a unique id/slug on every call', () => {
    const g = voicingLick(0, 'maj7', 'close', { genre: 'jazz' })
    const a = generatedToLick(g)
    const b = generatedToLick(g)
    expect(a.id).not.toBe(b.id)
    expect(a.slug).not.toBe(b.slug)
  })

  it('output validates against the shared submission schema (same as B/E)', () => {
    const g = voicingLick(4, 'm7', 'gospel', { genre: 'gospel' })
    const l = generatedToLick(g)
    expect(() => submissionSchema.parse(l)).not.toThrow()
  })
})

describe('isMinorishQuality / lickTonalityMatches', () => {
  it('treats m/m7/m7b5/dim as minor-ish, maj7/7/close as not', () => {
    expect(isMinorishQuality('m7')).toBe(true)
    expect(isMinorishQuality('m7b5')).toBe(true)
    expect(isMinorishQuality('maj7')).toBe(false)
    expect(isMinorishQuality('7')).toBe(false)
    expect(isMinorishQuality('')).toBe(false)
  })

  it('prefers the declared mode field when present', () => {
    const l = lick({ mode: 'minor', chords: [{ t: 0, d: 4, r: 0, q: 'maj7' }] })
    expect(lickTonalityMatches(l, 'minor')).toBe(true)
    expect(lickTonalityMatches(l, 'major')).toBe(false)
  })

  it('falls back to chord-based analysis when mode is unset', () => {
    const majorish = lick({ chords: [{ t: 0, d: 4, r: 0, q: 'maj7' }] })
    const minorish = lick({ chords: [{ t: 0, d: 4, r: 0, q: 'm7' }] })
    expect(lickTonalityMatches(majorish, 'major')).toBe(true)
    expect(lickTonalityMatches(minorish, 'minor')).toBe(true)
  })
})

describe('spiceGroupsForKey', () => {
  const licks: Lick[] = [
    lick({ id: '1', slug: 'a', category: 'fill', chords: [{ t: 0, d: 4, r: 0, q: 'maj7' }] }),
    lick({ id: '2', slug: 'b', category: 'turnaround', chords: [{ t: 0, d: 4, r: 0, q: 'maj7' }] }),
    lick({ id: '3', slug: 'c', category: 'groove', chords: [{ t: 0, d: 4, r: 0, q: 'm7' }] }), // minor, wrong key
    lick({ id: '4', slug: 'd', category: 'comp', harmonic_function: ['ii-V'], chords: [{ t: 0, d: 4, r: 0, q: 'maj7' }] }),
  ]

  it('groups by spice category, dropping tonality mismatches', () => {
    const groups = spiceGroupsForKey(licks, C_MAJOR)
    const fillGroup = groups.find((g) => g.category === 'fill')
    expect(fillGroup?.items.map((l) => l.slug)).toEqual(['a'])
    expect(groups.every((g) => g.items.every((l) => l.slug !== 'c'))).toBe(true)
  })

  it('picks up a lick via harmonic_function even when its own category differs (2-5-1 group)', () => {
    const groups = spiceGroupsForKey(licks, C_MAJOR)
    const twoFiveOne = groups.find((g) => g.category === 'two-five-one')
    expect(twoFiveOne?.items.map((l) => l.slug)).toContain('d')
  })

  it('respects genre/difficulty filters and empty groups are dropped entirely', () => {
    const groups = spiceGroupsForKey(licks, C_MAJOR, { genre: 'gospel' })
    expect(groups).toEqual([])
  })
})

describe('fillsForChord', () => {
  const licks: Lick[] = [
    lick({ id: '1', slug: 'major-fill', category: 'fill', chords: [{ t: 0, d: 4, r: 0, q: 'maj7' }] }),
    lick({ id: '2', slug: 'minor-fill', category: 'fill', chords: [{ t: 0, d: 4, r: 0, q: 'm7' }] }),
    lick({ id: '3', slug: 'not-a-fill', category: 'run', chords: [{ t: 0, d: 4, r: 0, q: 'maj7' }] }),
  ]

  it('only returns fills whose tonality matches the chosen chord quality', () => {
    expect(fillsForChord(licks, 0, 'maj7').map((l) => l.slug)).toEqual(['major-fill'])
    expect(fillsForChord(licks, 9, 'm7').map((l) => l.slug)).toEqual(['minor-fill'])
  })
})

describe('reharmSuggestions', () => {
  it('caps results to the chosen level (simple only shows 1 result)', () => {
    const simple = reharmSuggestions(C_MAJOR, 7, '7', 'simple', 'jazz', 'seed')
    const advanced = reharmSuggestions(C_MAJOR, 7, '7', 'advanced', 'jazz', 'seed')
    expect(simple.every((r) => r.level === 'simple')).toBe(true)
    expect(advanced.length).toBeGreaterThan(simple.length)
    expect(advanced.map((r) => r.level)).toEqual(LEVEL_ORDER)
  })

  it('is deterministic for a given seed', () => {
    const a = reharmSuggestions(C_MAJOR, 7, '7', 'advanced', 'jazz', 'fixed-seed')
    const b = reharmSuggestions(C_MAJOR, 7, '7', 'advanced', 'jazz', 'fixed-seed')
    expect(a).toEqual(b)
  })
})

describe('voicingStylesForLevel', () => {
  it('unlocks more (and more exotic) styles as the level rises', () => {
    const simple = voicingStylesForLevel('simple')
    const advanced = voicingStylesForLevel('advanced')
    expect(advanced.length).toBeGreaterThan(simple.length)
    expect(advanced).toEqual(expect.arrayContaining(simple))
    expect(advanced).toContain('quartal')
    expect(simple).not.toContain('quartal')
  })
})

describe('voicingLick', () => {
  it('builds a single sustained chord that validates against the submission schema', () => {
    const g = voicingLick(2, 'm9', 'rootless-b', { genre: 'neosoul', bpm: 72 })
    expect(() => submissionSchema.parse(generatedToLick(g))).not.toThrow()
    expect(g.chords).toEqual([{ t: 0, d: 4, r: 2, q: 'm9' }])
    expect(g.notes.every((n) => n.h === 'R')).toBe(true)
  })
})

describe('progression helpers', () => {
  const steps = [
    { root: 9, quality: 'm7', roman: 'i' },
    { root: 2, quality: 'm7b5', roman: 'ii°' },
    { root: 4, quality: '7', roman: 'V' },
  ]

  it('progressionToChords lays steps out on a 4-beat grid in order', () => {
    expect(progressionToChords(steps)).toEqual([
      { t: 0, d: 4, r: 9, q: 'm7' },
      { t: 4, d: 4, r: 2, q: 'm7b5' },
      { t: 8, d: 4, r: 4, q: '7' },
    ])
  })

  it('spiceForProgression returns one voicing per step, all validating', () => {
    const results = spiceForProgression(steps, { genre: 'gospel', level: 'advanced' })
    expect(results).toHaveLength(steps.length)
    for (const g of results) {
      expect(() => submissionSchema.parse(generatedToLick(g))).not.toThrow()
    }
  })
})

describe('A minor smoke test (non-C key sanity check)', () => {
  it('spiceGroupsForKey still matches minor licks when the session key is minor', () => {
    const licks: Lick[] = [lick({ id: '1', slug: 'a-fill', category: 'fill', chords: [{ t: 0, d: 4, r: 9, q: 'm7' }] })]
    const groups = spiceGroupsForKey(licks, A_MINOR)
    expect(groups.find((g) => g.category === 'fill')?.items.map((l) => l.slug)).toEqual(['a-fill'])
  })
})
