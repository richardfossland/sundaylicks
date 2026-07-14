// Tester de rene delene av sesjons-persisteringen (node-env — ingen DOM):
// parsePersisted-validering + persist-invarianten om at setKey/setInstrument
// alltid skriver HELE objektet (klobbe-regresjonen instrumentfeltet innførte).

import { describe, expect, it } from 'vitest'
import { parsePersisted, DEFAULT_KEY, DEFAULT_INSTRUMENT } from './session'

describe('parsePersisted', () => {
  it('round-tripper gyldig key + instrument', () => {
    const raw = JSON.stringify({ key: { root: 3, mode: 'minor' }, instrument: 'pad' })
    expect(parsePersisted(raw)).toEqual({ key: { root: 3, mode: 'minor' }, instrument: 'pad' })
  })

  it('round-tripper gitar-instrumentet (0005_instrument)', () => {
    const raw = JSON.stringify({ key: { root: 2, mode: 'major' }, instrument: 'gitar' })
    expect(parsePersisted(raw).instrument).toBe('gitar')
  })

  it('ukjent instrument faller tilbake til piano', () => {
    const raw = JSON.stringify({ key: { root: 0, mode: 'major' }, instrument: 'wurlitzer' })
    expect(parsePersisted(raw).instrument).toBe(DEFAULT_INSTRUMENT)
  })

  it('gammel blob UTEN instrument-felt er bakoverkompatibel', () => {
    const raw = JSON.stringify({ key: { root: 7, mode: 'major' } })
    expect(parsePersisted(raw)).toEqual({ key: { root: 7, mode: 'major' }, instrument: 'piano' })
  })

  it('korrupt JSON / null → defaults', () => {
    expect(parsePersisted('{oops')).toEqual({ key: DEFAULT_KEY, instrument: DEFAULT_INSTRUMENT })
    expect(parsePersisted(null)).toEqual({ key: DEFAULT_KEY, instrument: DEFAULT_INSTRUMENT })
  })

  it('ugyldig root klampes til default uten å røre instrument', () => {
    const raw = JSON.stringify({ key: { root: 99, mode: 'minor' }, instrument: 'elpiano' })
    expect(parsePersisted(raw)).toEqual({ key: { root: 0, mode: 'minor' }, instrument: 'elpiano' })
  })
})

describe('persist-invarianten (setKey må ikke klobbe instrument)', () => {
  it('store round-trip: setKey bevarer instrument, setInstrument bevarer key', async () => {
    // Minimal localStorage-shim — session.ts guards på typeof window.
    const store = new Map<string, string>()
    ;(globalThis as Record<string, unknown>).window = globalThis
    ;(globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    }
    try {
      const { useSession } = await import('./session')
      useSession.getState().load()
      useSession.getState().setInstrument('pad')
      useSession.getState().setKey({ root: 5 })
      const persisted = JSON.parse(store.get('sundaylicks_session')!)
      expect(persisted.instrument).toBe('pad')
      expect(persisted.key.root).toBe(5)
      useSession.getState().setInstrument('elpiano')
      const persisted2 = JSON.parse(store.get('sundaylicks_session')!)
      expect(persisted2.key.root).toBe(5)
      expect(persisted2.instrument).toBe('elpiano')
    } finally {
      delete (globalThis as Record<string, unknown>).localStorage
      delete (globalThis as Record<string, unknown>).window
    }
  })
})
