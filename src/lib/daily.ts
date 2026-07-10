// "Dagens økt" — a small, deterministic daily practice set + a streak counter.
// Two layers:
//   1. A pure, testable core (selectDailySession / computeStreak / isSessionDone)
//      that never touches the DOM, Date.now, or Math.random.
//   2. A thin, window-guarded localStorage wrapper (getOrCreateDailySession /
//      recordDailyCompletion) that degrades silently when storage is blocked —
//      same idiom as progress.ts / collections.ts.
//
// No audio, no DB, no network. Everything is derived from the licks the app
// already has and the local progress store.

import type { Lick } from '@/types/lick'
import { createSeededRng } from './theory/transitions'
import { todayKey, type Progress } from './progress'

export type DailyRole = 'repetisjon' | 'ny' | 'strekk'

export interface DailyPick {
  slug: string
  role: DailyRole
}

/** How many licks a full session aims for. Fewer only when the library can't fill it. */
const TARGET = 4

// ── Pure core ────────────────────────────────────────────────────────────────

/** Fisher–Yates using a seeded RNG — same seed always yields the same order.
 * Exported so the reel (`lib/reel.ts`) can reuse the exact same deterministic
 * shuffle; kept here because "Dagens økt" is its original home. */
export function seededShuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Rounded median difficulty across the licks the player has already practiced
 * (1 when they've practiced nothing). Drives which "new" material is picked. */
function practicedLevel(licks: Lick[], practiced: Set<string>): number {
  const diffs = licks
    .filter((l) => practiced.has(l.slug))
    .map((l) => l.difficulty)
    .sort((a, b) => a - b)
  if (diffs.length === 0) return 1
  const mid = Math.floor(diffs.length / 2)
  const median = diffs.length % 2 === 1 ? diffs[mid] : (diffs[mid - 1] + diffs[mid]) / 2
  return Math.round(median)
}

/**
 * Choose today's session: aims for 2 "repetisjon" (least-recently practiced),
 * 1 "ny" (unpracticed at or below the player's level) and 1 "strekk"
 * (unpracticed one level up). Deterministic for a given (dateKey, licks,
 * progress). Every slot has a fallback cascade so a thin library, a brand-new
 * player, or an all-practiced library still returns a coherent set:
 *   role reflects reality — a practiced lick is always "repetisjon", so a fully
 *   practiced library yields an all-repetisjon session, and a fresh player gets
 *   mostly "ny" + one "strekk".
 */
export function selectDailySession(dateKey: string, licks: Lick[], progress: Progress): DailyPick[] {
  const rng = createSeededRng(dateKey)
  const practiced = new Set(progress.practiced)
  const lastPracticed = progress.lastPracticed ?? {}

  const practicedLicks = licks.filter((l) => practiced.has(l.slug))
  const unpracticed = licks.filter((l) => !practiced.has(l.slug))

  const level = practicedLevel(licks, practiced)
  const stretchLevel = Math.min(level + 1, 3)

  // Least-recently-practiced first (missing date = oldest), stable slug tiebreak;
  // then shuffle the 6 oldest so a big backlog rotates day to day.
  const byOldest = [...practicedLicks].sort((a, b) => {
    const da = lastPracticed[a.slug] ?? ''
    const db = lastPracticed[b.slug] ?? ''
    if (da !== db) return da < db ? -1 : 1
    return a.slug < b.slug ? -1 : 1
  })
  const oldestPool = seededShuffle(byOldest.slice(0, 6), rng).map((l) => l.slug)

  // Pools are shuffled in a FIXED order so RNG consumption stays deterministic.
  const nyPool = seededShuffle(unpracticed.filter((l) => l.difficulty <= level), rng).map((l) => l.slug)
  const strekkPool = seededShuffle(unpracticed.filter((l) => l.difficulty === stretchLevel), rng).map((l) => l.slug)
  const anyUnpracticedPool = seededShuffle(unpracticed, rng).map((l) => l.slug)
  const anyLickPool = seededShuffle(licks, rng).map((l) => l.slug)

  const used = new Set<string>()
  const picks: DailyPick[] = []

  // Fill one slot from the first pool that still has an unused slug. Role is the
  // slot's intent for a genuinely new lick, but any already-practiced lick is
  // always labelled "repetisjon".
  function take(intent: 'ny' | 'strekk', pools: string[][]) {
    for (const pool of pools) {
      for (const slug of pool) {
        if (used.has(slug)) continue
        used.add(slug)
        picks.push({ slug, role: practiced.has(slug) ? 'repetisjon' : intent })
        return
      }
    }
  }

  take('ny', [oldestPool, nyPool, anyUnpracticedPool, anyLickPool])
  take('ny', [oldestPool, nyPool, anyUnpracticedPool, anyLickPool])
  take('ny', [nyPool, anyUnpracticedPool, anyLickPool])
  take('strekk', [strekkPool, nyPool, anyUnpracticedPool, anyLickPool])

  return picks.slice(0, TARGET)
}

/** All of a session's slugs practiced on `dateKey` (i.e. the day is complete). */
export function isSessionDone(slugs: string[], progress: Progress, dateKey: string): boolean {
  if (slugs.length === 0) return false
  const last = progress.lastPracticed ?? {}
  return slugs.every((s) => last[s] === dateKey)
}

/** Local 'YYYY-MM-DD' shifted by `delta` days — pure calendar math, no clock. */
function addDays(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return todayKey(new Date(y, m - 1, d + delta))
}

/**
 * Length of the run of consecutive completed days ending today — or yesterday,
 * so an as-yet-unfinished today doesn't reset the flame. Pure string math.
 */
export function computeStreak(completedDates: string[], today: string): number {
  const done = new Set(completedDates)
  let cursor: string
  if (done.has(today)) cursor = today
  else {
    const yesterday = addDays(today, -1)
    if (done.has(yesterday)) cursor = yesterday
    else return 0
  }
  let count = 0
  while (done.has(cursor)) {
    count++
    cursor = addDays(cursor, -1)
  }
  return count
}

// ── Storage (window-guarded, degrades silently) ─────────────────────────────

const DAILY_KEY = 'sundaylicks_daily'
const PRUNE_DAYS = 14

interface DailyStore {
  /** date 'YYYY-MM-DD' → the frozen picks chosen that day (roles kept stable). */
  sessions: Record<string, DailyPick[]>
  /** dates whose session was fully completed. */
  completedDates: string[]
}

const EMPTY_STORE: DailyStore = { sessions: {}, completedDates: [] }

export function loadDaily(): DailyStore {
  if (typeof window === 'undefined') return EMPTY_STORE
  try {
    const raw = localStorage.getItem(DAILY_KEY)
    if (!raw) return { sessions: {}, completedDates: [] }
    const p = JSON.parse(raw) as Partial<DailyStore>
    return { sessions: p.sessions ?? {}, completedDates: p.completedDates ?? [] }
  } catch {
    return { sessions: {}, completedDates: [] }
  }
}

function saveDaily(store: DailyStore) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(store))
  } catch {
    /* storage full / blocked — ignore */
  }
}

/** Drop sessions older than PRUNE_DAYS so the store can't grow unbounded. */
function pruneSessions(sessions: Record<string, DailyPick[]>, today: string): Record<string, DailyPick[]> {
  const cutoff = addDays(today, -PRUNE_DAYS)
  const out: Record<string, DailyPick[]> = {}
  for (const [k, v] of Object.entries(sessions)) {
    if (k >= cutoff) out[k] = v // 'YYYY-MM-DD' sorts lexicographically = chronologically
  }
  return out
}

/**
 * Today's picks — freshly selected the first time and then frozen for the day
 * (stored picks win, so both the lick set and their role labels stay stable
 * even as `progress` changes underfoot). Prunes stale sessions on write.
 */
export function getOrCreateDailySession(dateKey: string, licks: Lick[], progress: Progress): DailyPick[] {
  const store = loadDaily()
  const existing = store.sessions[dateKey]
  if (existing && existing.length > 0) return existing

  const picks = selectDailySession(dateKey, licks, progress)
  const sessions = pruneSessions({ ...store.sessions, [dateKey]: picks }, dateKey)
  saveDaily({ sessions, completedDates: store.completedDates })
  return picks
}

/** Read today's stored slugs without creating a session (used off the lick page,
 * where the full library isn't loaded). Empty when no session exists yet. */
export function getDailySessionSlugs(dateKey: string): string[] {
  return (loadDaily().sessions[dateKey] ?? []).map((p) => p.slug)
}

/** Mark `dateKey` complete once every slug in its session has been practiced
 * today. Idempotent; a no-op if there's no session or it isn't finished. */
export function recordDailyCompletion(dateKey: string, progress: Progress): void {
  const store = loadDaily()
  const picks = store.sessions[dateKey]
  if (!picks || picks.length === 0) return
  if (store.completedDates.includes(dateKey)) return
  if (!isSessionDone(picks.map((p) => p.slug), progress, dateKey)) return
  saveDaily({ sessions: store.sessions, completedDates: [...store.completedDates, dateKey] })
}
