'use client'

import { create } from 'zustand'

// The player's current "toneart" (key) — a single global choice that drives
// what the dashboard highlights and which key a lick opens transposed into.
// Per-device, no auth, same manual localStorage pattern as collections.ts so
// every consumer (header selector, dashboard, cards) stays in sync reactively.

const STORAGE_KEY = 'sundaylicks_session'

export type KeyMode = 'major' | 'minor'

export interface SessionKey {
  root: number // pitch class 0–11, 0 = C
  mode: KeyMode
}

export const DEFAULT_KEY: SessionKey = { root: 0, mode: 'major' }

interface Persisted {
  key: SessionKey
}

interface SessionState extends Persisted {
  hydrated: boolean
  load: () => void
  setKey: (patch: Partial<SessionKey>) => void
}

function isValidRoot(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 11
}

function read(): Persisted {
  if (typeof window === 'undefined') return { key: DEFAULT_KEY }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { key: DEFAULT_KEY }
    const p = JSON.parse(raw) as Partial<Persisted>
    return {
      key: {
        root: isValidRoot(p.key?.root) ? p.key!.root : DEFAULT_KEY.root,
        mode: p.key?.mode === 'minor' ? 'minor' : 'major',
      },
    }
  } catch {
    return { key: DEFAULT_KEY }
  }
}

function write(p: Persisted) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    /* storage blocked — ignore */
  }
}

export const useSession = create<SessionState>((set) => ({
  key: DEFAULT_KEY,
  hydrated: false,

  load: () => set({ ...read(), hydrated: true }),

  setKey: (patch) =>
    set((s) => {
      const next = { key: { ...s.key, ...patch } }
      write(next)
      return next
    }),
}))
