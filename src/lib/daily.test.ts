import { describe, expect, it } from 'vitest'

import type { Difficulty, Lick } from '@/types/lick'
import { todayKey, type Progress } from './progress'
import { computeStreak, isSessionDone, selectDailySession, type DailyPick } from './daily'

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeLick(slug: string, difficulty: Difficulty): Lick {
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

// A small mixed-difficulty library (4× each level = 12 licks).
const LIBRARY: Lick[] = [
  ...([1, 2, 3] as Difficulty[]).flatMap((d) => [0, 1, 2, 3].map((i) => makeLick(`l${d}-${i}`, d))),
]

function progress(over: Partial<Progress> = {}): Progress {
  return { practiced: [], bestBpm: {}, lastPracticed: {}, ...over }
}

const slugs = (picks: DailyPick[]) => picks.map((p) => p.slug)
const roles = (picks: DailyPick[]) => picks.map((p) => p.role)

// ── selectDailySession ───────────────────────────────────────────────────────

describe('selectDailySession — determinism', () => {
  it('is stable for identical inputs', () => {
    const a = selectDailySession('2026-07-09', LIBRARY, progress())
    const b = selectDailySession('2026-07-09', LIBRARY, progress())
    expect(a).toEqual(b)
  })

  it('varies by date', () => {
    const dates = ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05']
    const shapes = new Set(dates.map((d) => JSON.stringify(slugs(selectDailySession(d, LIBRARY, progress())))))
    expect(shapes.size).toBeGreaterThan(1)
  })
})

describe('selectDailySession — size & dedup', () => {
  it('returns 4 picks for a full library', () => {
    const picks = selectDailySession('2026-07-09', LIBRARY, progress())
    expect(picks).toHaveLength(4)
  })

  it('never repeats a slug', () => {
    const picks = selectDailySession('2026-07-09', LIBRARY, progress())
    expect(new Set(slugs(picks)).size).toBe(picks.length)
  })

  it('returns fewer picks when the library is tiny', () => {
    const two = [makeLick('a', 1), makeLick('b', 1)]
    const picks = selectDailySession('2026-07-09', two, progress())
    expect(picks).toHaveLength(2)
    expect(new Set(slugs(picks)).size).toBe(2)
  })

  it('returns an empty session for an empty library', () => {
    expect(selectDailySession('2026-07-09', [], progress())).toEqual([])
  })
})

describe('selectDailySession — role distribution', () => {
  it('mixes 2 repetisjon + 1 ny + 1 strekk for a mid-progress player', () => {
    // Practiced four level-1 licks a while ago → they are the repetisjon pool;
    // level-2/3 licks stay unpracticed for ny/strekk.
    const practiced = ['l1-0', 'l1-1', 'l1-2', 'l1-3']
    const lastPracticed = Object.fromEntries(practiced.map((s) => [s, '2026-06-01']))
    const picks = selectDailySession('2026-07-09', LIBRARY, progress({ practiced, lastPracticed }))
    const r = roles(picks)
    expect(r.filter((x) => x === 'repetisjon')).toHaveLength(2)
    expect(r.filter((x) => x === 'ny')).toHaveLength(1)
    expect(r.filter((x) => x === 'strekk')).toHaveLength(1)
    // repetisjon picks come from the practiced set; ny/strekk do not.
    for (const p of picks) {
      if (p.role === 'repetisjon') expect(practiced).toContain(p.slug)
      else expect(practiced).not.toContain(p.slug)
    }
  })

  it('a fresh player gets all-new material (no repetisjon)', () => {
    const picks = selectDailySession('2026-07-09', LIBRARY, progress())
    expect(roles(picks)).not.toContain('repetisjon')
    expect(roles(picks)).toContain('ny')
    expect(roles(picks)).toContain('strekk')
  })

  it('an all-practiced library yields a pure repetisjon session', () => {
    const practiced = LIBRARY.map((l) => l.slug)
    const lastPracticed = Object.fromEntries(practiced.map((s, i) => [s, `2026-06-${String((i % 28) + 1).padStart(2, '0')}`]))
    const picks = selectDailySession('2026-07-09', LIBRARY, progress({ practiced, lastPracticed }))
    expect(picks).toHaveLength(4)
    expect(roles(picks).every((x) => x === 'repetisjon')).toBe(true)
  })

  it('repetisjon draws from the oldest window, never the freshly-practiced', () => {
    // Eight practiced licks: six old (the eligible window) + two practiced today.
    // Only the oldest six may be reused, so today's two are never repetisjon.
    const old = ['l1-0', 'l1-1', 'l1-2', 'l1-3', 'l2-0', 'l2-1']
    const fresh = ['l2-2', 'l2-3']
    const practiced = [...old, ...fresh]
    const lastPracticed: Record<string, string> = {
      ...Object.fromEntries(old.map((s, i) => [s, `2026-01-0${i + 1}`])),
      'l2-2': '2026-07-09',
      'l2-3': '2026-07-09',
    }
    const rep = selectDailySession('2026-07-09', LIBRARY, progress({ practiced, lastPracticed }))
      .filter((p) => p.role === 'repetisjon')
      .map((p) => p.slug)
    expect(rep).toHaveLength(2)
    for (const s of rep) expect(old).toContain(s)
    for (const s of fresh) expect(rep).not.toContain(s)
  })
})

// ── isSessionDone ────────────────────────────────────────────────────────────

describe('isSessionDone', () => {
  const p = progress({ lastPracticed: { a: '2026-07-09', b: '2026-07-09', c: '2026-07-08' } })

  it('is true when every slug was practiced on the date', () => {
    expect(isSessionDone(['a', 'b'], p, '2026-07-09')).toBe(true)
  })

  it('is false when a slug was practiced on another day', () => {
    expect(isSessionDone(['a', 'c'], p, '2026-07-09')).toBe(false)
  })

  it('is false when a slug was never practiced', () => {
    expect(isSessionDone(['a', 'z'], p, '2026-07-09')).toBe(false)
  })

  it('is false for an empty session', () => {
    expect(isSessionDone([], p, '2026-07-09')).toBe(false)
  })
})

// ── computeStreak ────────────────────────────────────────────────────────────

describe('computeStreak', () => {
  const today = '2026-07-09'

  it('is 0 with no completed days', () => {
    expect(computeStreak([], today)).toBe(0)
  })

  it('is 1 when only today is done', () => {
    expect(computeStreak([today], today)).toBe(1)
  })

  it('counts a consecutive run ending today', () => {
    expect(computeStreak(['2026-07-07', '2026-07-08', '2026-07-09'], today)).toBe(3)
  })

  it('stops at a gap', () => {
    expect(computeStreak(['2026-07-06', '2026-07-08', '2026-07-09'], today)).toBe(2)
  })

  it('keeps the streak alive when today is not yet done but yesterday is', () => {
    expect(computeStreak(['2026-07-07', '2026-07-08'], today)).toBe(2)
  })

  it('is 0 when the most recent completion is older than yesterday', () => {
    expect(computeStreak(['2026-07-06', '2026-07-07'], today)).toBe(0)
  })

  it('is order-independent', () => {
    expect(computeStreak(['2026-07-09', '2026-07-07', '2026-07-08'], today)).toBe(3)
  })

  it('crosses a month boundary', () => {
    expect(computeStreak(['2026-06-29', '2026-06-30', '2026-07-01'], '2026-07-01')).toBe(3)
  })
})

// ── todayKey ─────────────────────────────────────────────────────────────────

describe('todayKey', () => {
  it('formats as local YYYY-MM-DD', () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(todayKey(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('uses the local calendar day, not UTC', () => {
    // 23:00 local on the 1st must stay the 1st (toISOString would roll to the 2nd
    // for positive-offset zones).
    expect(todayKey(new Date(2026, 0, 1, 23, 0, 0))).toBe('2026-01-01')
  })

  it('matches the format everywhere', () => {
    expect(todayKey(new Date())).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
