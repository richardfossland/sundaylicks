import type { HandFilter } from '@/types/lick'
import { KEY_NAMES } from './music'

// Shareable practice state encoded in the URL, e.g. ?key=Eb&bpm=80&hand=R.
// Keys use readable note names; hand is both|L|R. PLAN §6 (Fase 2).

export interface ShareState {
  key?: number // pitch class 0–11
  bpm?: number
  hand?: HandFilter
}

export function parseShare(search: string): ShareState {
  const q = new URLSearchParams(search)
  const out: ShareState = {}

  const key = q.get('key')
  if (key) {
    const idx = KEY_NAMES.findIndex((n) => n.toLowerCase() === key.toLowerCase())
    if (idx >= 0) out.key = idx
  }

  const bpm = q.get('bpm')
  if (bpm) {
    const n = Number(bpm)
    if (Number.isFinite(n) && n >= 40 && n <= 180) out.bpm = Math.round(n)
  }

  const hand = q.get('hand')
  if (hand === 'L' || hand === 'R' || hand === 'both') out.hand = hand

  return out
}

/** Build the query string (no leading `?`) for the current practice state. */
export function buildShare(s: Required<ShareState>): string {
  const q = new URLSearchParams()
  q.set('key', KEY_NAMES[s.key])
  q.set('bpm', String(s.bpm))
  q.set('hand', s.hand)
  return q.toString()
}
