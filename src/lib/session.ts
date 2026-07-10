'use client'

import { create } from 'zustand'
import { isValidInstrument, type InstrumentKind } from './instruments'

// The player's current "toneart" (key) AND instrument sound — global per-device
// choices that drive what the dashboard highlights, which key a lick opens
// transposed into, and which sound the engine plays with (AppShell speiler
// `instrument` inn i playback-motoren). Same manual localStorage pattern as
// collections.ts so every consumer stays in sync reactively.
//
// ⚠️ Persist-invariant: HVER skriving må skrive HELE Persisted-objektet —
// setKey som bare skrev {key} ville klobbet instrument (dekket av test).

const STORAGE_KEY = 'sundaylicks_session'

export type KeyMode = 'major' | 'minor'

export interface SessionKey {
  root: number // pitch class 0–11, 0 = C
  mode: KeyMode
}

export const DEFAULT_KEY: SessionKey = { root: 0, mode: 'major' }

export const DEFAULT_INSTRUMENT: InstrumentKind = 'piano'

interface Persisted {
  key: SessionKey
  instrument: InstrumentKind
}

interface SessionState extends Persisted {
  hydrated: boolean
  load: () => void
  setKey: (patch: Partial<SessionKey>) => void
  setInstrument: (kind: InstrumentKind) => void
}

function isValidRoot(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 11
}

/** Eksportert for test: parse/valider en rå lagrings-blob til gyldig Persisted. */
export function parsePersisted(raw: string | null): Persisted {
  const fallback: Persisted = { key: DEFAULT_KEY, instrument: DEFAULT_INSTRUMENT }
  if (!raw) return fallback
  try {
    const p = JSON.parse(raw) as Partial<Persisted>
    return {
      key: {
        root: isValidRoot(p.key?.root) ? p.key!.root : DEFAULT_KEY.root,
        mode: p.key?.mode === 'minor' ? 'minor' : 'major',
      },
      instrument: isValidInstrument(p.instrument) ? p.instrument : DEFAULT_INSTRUMENT,
    }
  } catch {
    return fallback
  }
}

function read(): Persisted {
  if (typeof window === 'undefined') return { key: DEFAULT_KEY, instrument: DEFAULT_INSTRUMENT }
  try {
    return parsePersisted(localStorage.getItem(STORAGE_KEY))
  } catch {
    return { key: DEFAULT_KEY, instrument: DEFAULT_INSTRUMENT }
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
  instrument: DEFAULT_INSTRUMENT,
  hydrated: false,

  load: () => set({ ...read(), hydrated: true }),

  setKey: (patch) =>
    set((s) => {
      // Skriv HELE persist-objektet — ellers klobbes instrument (se invariant).
      const next: Persisted = { key: { ...s.key, ...patch }, instrument: s.instrument }
      write(next)
      return next
    }),

  setInstrument: (kind) =>
    set((s) => {
      const next: Persisted = { key: s.key, instrument: kind }
      write(next)
      return next
    }),
}))
