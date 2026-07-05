// Local, per-device practice progress (no auth). PLAN §6 Fase 3.
//   - which licks have been practiced
//   - best (fastest) BPM reached per lick
// Stored in localStorage under one JSON key.

const KEY = 'sundaylicks_progress'

export interface Progress {
  practiced: string[] // slugs
  bestBpm: Record<string, number> // slug → fastest BPM played
}

const EMPTY: Progress = { practiced: [], bestBpm: {} }

export function getProgress(): Progress {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const p = JSON.parse(raw) as Partial<Progress>
    return { practiced: p.practiced ?? [], bestBpm: p.bestBpm ?? {} }
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

/** Mark a lick as practiced and record the BPM if it's a new best. */
export function recordPractice(slug: string, bpm: number): Progress {
  const p = getProgress()
  if (!p.practiced.includes(slug)) p.practiced = [...p.practiced, slug]
  if (!p.bestBpm[slug] || bpm > p.bestBpm[slug]) p.bestBpm[slug] = bpm
  save(p)
  return p
}
