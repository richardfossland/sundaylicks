// "Reels-blaing" (/bla) — a stable, random order over the whole library plus a
// remembered scroll position, so paging through the whole library feels like flicking a
// feed instead of re-shuffling on every re-render or back-navigation.
//
// Two layers, mirroring daily.ts:
//   1. A pure, testable core (newReelState / parseReelState / reelOrder) that
//      never touches storage, the clock, or Math.random — all of those are
//      passed in — so determinism and staleness are unit-testable.
//   2. A thin, window-guarded sessionStorage wrapper (loadOrCreateReelState /
//      saveReelIndex) that degrades silently when storage is blocked.
//
// Invariants:
//   • The seed alone determines the order (reelOrder is a pure permutation of
//     the input), so the same seed always yields byte-identical paging.
//   • `ts` is the moment the SEED was minted and is the ONLY staleness anchor —
//     saving the scroll index must never rewrite it, otherwise an active
//     browsing session would keep resetting its own 30-minute freshness clock
//     and could re-shuffle mid-scroll. saveReelIndex therefore preserves ts.
//   • A brand-new seed is minted only when none is stored or the stored one has
//     aged past REEL_TTL_MS — so returning within the window (e.g. via the
//     practice page and back) lands on the same shuffled order and card.

import { seededShuffle } from './daily'
import { createSeededRng } from './theory/transitions'

const REEL_KEY = 'sundaylicks_reel'

/** How long a shuffled order stays "the current reel" before a fresh shuffle. */
export const REEL_TTL_MS = 30 * 60 * 1000 // 30 minutes

export interface ReelState {
  /** Opaque string seed (a UUID in practice) — drives the shuffle order. */
  seed: string
  /** Epoch ms the seed was minted; the sole staleness anchor (see invariants). */
  ts: number
  /** Last active card index, restored on return. */
  index: number
}

// ── Pure core ────────────────────────────────────────────────────────────────

/** A fresh reel state for `seed`, stamped at `now`, starting at the first card. */
export function newReelState(seed: string, now: number): ReelState {
  return { seed, ts: now, index: 0 }
}

/**
 * Validate + parse a stored reel blob. Returns null when it is absent, corrupt,
 * structurally invalid, or stale (minted more than REEL_TTL_MS before `now`) —
 * i.e. exactly the cases in which the caller should mint a new seed. A malformed
 * `index` is tolerated (clamped to 0) rather than discarding an otherwise fresh
 * seed, since the order matters more than the remembered position.
 */
export function parseReelState(raw: string | null, now: number): ReelState | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as Partial<ReelState>
    if (typeof p.seed !== 'string' || p.seed.length === 0) return null
    if (typeof p.ts !== 'number' || !Number.isFinite(p.ts)) return null
    if (now - p.ts > REEL_TTL_MS) return null // stale — force a re-shuffle
    const index = typeof p.index === 'number' && Number.isInteger(p.index) && p.index >= 0 ? p.index : 0
    return { seed: p.seed, ts: p.ts, index }
  } catch {
    return null
  }
}

/**
 * The library in reel order for `seed` — a pure permutation of `licks` (same
 * members, same length), deterministic per seed. Reuses the daily shuffle so
 * both features share one well-tested Fisher–Yates.
 */
export function reelOrder<T>(licks: readonly T[], seed: string): T[] {
  return seededShuffle(licks, createSeededRng(seed))
}

// ── Storage (window-guarded, degrades silently) ─────────────────────────────

/** A hard-to-collide seed. crypto.randomUUID where available; time+random else. */
function makeSeed(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    /* fall through */
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function writeState(state: ReelState) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(REEL_KEY, JSON.stringify(state))
  } catch {
    /* storage full / blocked — ignore */
  }
}

/**
 * The current reel state: the stored one if present and fresh, otherwise a
 * newly-minted seed (persisted immediately). Call this once, in an effect, so
 * the seed/shuffle stays out of the server render (hydration safety).
 */
export function loadOrCreateReelState(now: number = Date.now()): ReelState {
  let raw: string | null = null
  if (typeof window !== 'undefined') {
    try {
      raw = sessionStorage.getItem(REEL_KEY)
    } catch {
      raw = null
    }
  }
  const existing = parseReelState(raw, now)
  if (existing) return existing
  const fresh = newReelState(makeSeed(), now)
  writeState(fresh)
  return fresh
}

/**
 * Persist the active card index WITHOUT touching the seed or its `ts` — so the
 * freshness window keeps counting from the shuffle, never from the last scroll.
 * A no-op when the stored reel is gone or has gone stale (nothing to update).
 */
export function saveReelIndex(index: number, now: number = Date.now()) {
  if (typeof window === 'undefined') return
  let raw: string | null = null
  try {
    raw = sessionStorage.getItem(REEL_KEY)
  } catch {
    return
  }
  const existing = parseReelState(raw, now)
  if (!existing) return
  writeState({ ...existing, index })
}
