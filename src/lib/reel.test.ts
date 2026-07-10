import { describe, expect, it } from 'vitest'

import type { Difficulty, Lick } from '@/types/lick'
import { REEL_TTL_MS, newReelState, parseReelState, reelOrder } from './reel'

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeLick(slug: string, difficulty: Difficulty = 1): Lick {
  return {
    id: `id:${slug}`,
    slug,
    name: slug,
    description: null,
    category: 'fill',
    genre: 'jazz',
    difficulty,
    original_key: 0,
    default_bpm: 90,
    beats: 4,
    time_signature: '4/4',
    notes: [],
    chords: [],
    tags: [],
    status: 'published',
  }
}

const LIBRARY: Lick[] = Array.from({ length: 40 }, (_, i) => makeLick(`l${i}`))
const slugs = (ls: Lick[]) => ls.map((l) => l.slug)

// ── reelOrder ────────────────────────────────────────────────────────────────

describe('reelOrder — determinism', () => {
  it('is stable for the same seed', () => {
    expect(slugs(reelOrder(LIBRARY, 'seed-a'))).toEqual(slugs(reelOrder(LIBRARY, 'seed-a')))
  })

  it('is a permutation of the input (same members, same length)', () => {
    const out = reelOrder(LIBRARY, 'seed-a')
    expect(out).toHaveLength(LIBRARY.length)
    expect(new Set(slugs(out))).toEqual(new Set(slugs(LIBRARY)))
  })

  it('does not mutate the input array', () => {
    const before = slugs(LIBRARY)
    reelOrder(LIBRARY, 'seed-a')
    expect(slugs(LIBRARY)).toEqual(before)
  })

  it('yields a different order for different seeds', () => {
    const a = slugs(reelOrder(LIBRARY, 'seed-a'))
    const b = slugs(reelOrder(LIBRARY, 'seed-b'))
    expect(a).not.toEqual(b)
  })

  it('handles empty and single-element libraries', () => {
    expect(reelOrder([], 'seed-a')).toEqual([])
    expect(slugs(reelOrder([makeLick('only')], 'seed-a'))).toEqual(['only'])
  })
})

// ── newReelState ─────────────────────────────────────────────────────────────

describe('newReelState', () => {
  it('stamps the seed + time and starts at index 0', () => {
    expect(newReelState('s', 1000)).toEqual({ seed: 's', ts: 1000, index: 0 })
  })
})

// ── parseReelState ───────────────────────────────────────────────────────────

describe('parseReelState — validation', () => {
  const now = 1_000_000

  it('returns null for null / empty input', () => {
    expect(parseReelState(null, now)).toBeNull()
    expect(parseReelState('', now)).toBeNull()
  })

  it('returns null for corrupt JSON', () => {
    expect(parseReelState('{not json', now)).toBeNull()
    expect(parseReelState('null', now)).toBeNull()
  })

  it('returns null when the seed is missing or blank', () => {
    expect(parseReelState(JSON.stringify({ ts: now, index: 0 }), now)).toBeNull()
    expect(parseReelState(JSON.stringify({ seed: '', ts: now, index: 0 }), now)).toBeNull()
  })

  it('returns null when ts is missing or non-finite', () => {
    expect(parseReelState(JSON.stringify({ seed: 's', index: 0 }), now)).toBeNull()
    expect(parseReelState(JSON.stringify({ seed: 's', ts: 'x', index: 0 }), now)).toBeNull()
  })

  it('accepts a fresh, well-formed state', () => {
    const raw = JSON.stringify({ seed: 's', ts: now, index: 5 })
    expect(parseReelState(raw, now)).toEqual({ seed: 's', ts: now, index: 5 })
  })

  it('clamps a malformed index to 0 rather than discarding a fresh seed', () => {
    const raw = JSON.stringify({ seed: 's', ts: now, index: -3 })
    expect(parseReelState(raw, now)).toEqual({ seed: 's', ts: now, index: 0 })
  })
})

describe('parseReelState — staleness boundary', () => {
  const minted = 1_000_000
  const raw = JSON.stringify({ seed: 's', ts: minted, index: 2 })

  it('is still valid exactly at the TTL boundary', () => {
    expect(parseReelState(raw, minted + REEL_TTL_MS)).not.toBeNull()
  })

  it('is stale one millisecond past the TTL', () => {
    expect(parseReelState(raw, minted + REEL_TTL_MS + 1)).toBeNull()
  })
})
