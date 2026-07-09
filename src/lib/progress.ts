// Local, per-device practice progress (no auth). PLAN §6 Fase 3.
//   - which licks have been practiced
//   - best (fastest) BPM reached per lick
//   - the LOCAL date each lick was last practiced (for streaks / Dagens økt)
// Stored in localStorage under one JSON key.

const KEY = 'sundaylicks_progress'

export interface Progress {
  practiced: string[] // slugs
  bestBpm: Record<string, number> // slug → fastest BPM played
  /** slug → LOCAL 'YYYY-MM-DD' the lick was most recently practiced. */
  lastPracticed: Record<string, string>
}

const EMPTY: Progress = { practiced: [], bestBpm: {}, lastPracticed: {} }

/** Today's LOCAL date as 'YYYY-MM-DD'. Uses local calendar parts on purpose —
 * `toISOString()` is UTC and would roll the day over at the wrong moment in
 * Norway (e.g. 22:00 local becomes the next day). */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getProgress(): Progress {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const p = JSON.parse(raw) as Partial<Progress>
    return {
      practiced: p.practiced ?? [],
      bestBpm: p.bestBpm ?? {},
      lastPracticed: p.lastPracticed ?? {},
    }
  } catch {
    return EMPTY
  }
}

function save(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* storage full / blocked — ignore */
  }
}

/** Mark a lick as practiced, record the BPM if it's a new best, and stamp
 * today's local date as the last-practiced day. */
export function recordPractice(slug: string, bpm: number): Progress {
  const p = getProgress()
  if (!p.practiced.includes(slug)) p.practiced = [...p.practiced, slug]
  if (!p.bestBpm[slug] || bpm > p.bestBpm[slug]) p.bestBpm[slug] = bpm
  p.lastPracticed = { ...p.lastPracticed, [slug]: todayKey() }
  save(p)
  return p
}
