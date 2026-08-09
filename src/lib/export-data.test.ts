// Tester den rene eksport-samleren (node-env — lageret injiseres).

import { describe, expect, it } from 'vitest'
import { EXPORT_PREFIX, collectExportData, type StorageLike } from './export-data'

/** Minimal StorageLike over et vanlig objekt. */
function fromMap(m: Record<string, string>): StorageLike {
  const keys = Object.keys(m)
  return {
    get length() {
      return keys.length
    },
    key: (i: number) => keys[i] ?? null,
    getItem: (k: string) => (k in m ? m[k] : null),
  }
}

describe('collectExportData', () => {
  it('samler og parser de fire opprinnelige nøklene', () => {
    const bundle = collectExportData(
      fromMap({
        sundaylicks_progress: JSON.stringify({ practiced: ['a'] }),
        sundaylicks_collections: JSON.stringify({ favorites: ['b'] }),
        sundaylicks_session: JSON.stringify({ key: { root: 2, mode: 'major' } }),
        sundaylicks_prefs: JSON.stringify({ metronome: true }),
      }),
    )
    expect(bundle.data.progress).toEqual({ practiced: ['a'] })
    expect(bundle.data.collections).toEqual({ favorites: ['b'] })
    expect(bundle.data.session).toEqual({ key: { root: 2, mode: 'major' } })
    expect(bundle.data.prefs).toEqual({ metronome: true })
  })

  it('manglende nøkler blir null', () => {
    const bundle = collectExportData(fromMap({}))
    expect(bundle.data).toEqual({ progress: null, collections: null, session: null, prefs: null })
  })

  it('tar med ALT under prefikset — ikke bare de fire kjente', () => {
    const bundle = collectExportData(
      fromMap({
        sundaylicks_progress: JSON.stringify({ practiced: [] }),
        sundaylicks_daily: JSON.stringify({ date: '2026-08-09', done: true }),
        sundaylicks_reel: JSON.stringify({ seed: 42 }),
        sundaylicks_onboarded: '1',
        sundaylicks_reel_autoplay: 'true',
      }),
    )
    expect(bundle.data.daily).toEqual({ date: '2026-08-09', done: true })
    expect(bundle.data.reel).toEqual({ seed: 42 })
    expect(bundle.data.onboarded).toBe(1)
    expect(bundle.data.reel_autoplay).toBe(true)
  })

  it('ignorerer nøkler uten prefikset (andre apper på samme domene)', () => {
    const bundle = collectExportData(
      fromMap({ sundayrec_noe: 'x', 'annen-app': 'y', sundaylicks_prefs: '{"a":1}' }),
    )
    expect(bundle.data.prefs).toEqual({ a: 1 })
    expect(Object.keys(bundle.data)).toEqual(['progress', 'collections', 'session', 'prefs'])
  })

  it('tar vare på rene strengverdier i stedet for å kaste dem (f.eks. user_id)', () => {
    const bundle = collectExportData(fromMap({ sundaylicks_user_id: 'u_abc-123' }))
    expect(bundle.data.user_id).toBe('u_abc-123')
  })

  it('korrupt JSON kaster ikke — verdien beholdes som råstreng', () => {
    const bundle = collectExportData(fromMap({ sundaylicks_progress: '{oops' }))
    expect(bundle.data.progress).toBe('{oops')
  })

  it('blokkert lagring gir en tom, gyldig konvolutt i stedet for å kaste', () => {
    const blocked: StorageLike = {
      get length(): number {
        throw new DOMException('The operation is insecure.', 'SecurityError')
      },
      key: () => null,
      getItem: () => {
        throw new DOMException('The operation is insecure.', 'SecurityError')
      },
    }
    const bundle = collectExportData(blocked)
    expect(bundle.data).toEqual({ progress: null, collections: null, session: null, prefs: null })
  })

  it('har riktig konvolutt (app/version/exportedAt)', () => {
    const bundle = collectExportData(fromMap({}))
    expect(bundle.app).toBe('sundaylicks')
    expect(bundle.version).toBe(2)
    expect(typeof bundle.exportedAt).toBe('string')
    expect(Number.isNaN(Date.parse(bundle.exportedAt))).toBe(false)
  })

  it('eksport og nullstilling er enige om prefikset', () => {
    // SettingsView.onReset feier alt som starter med EXPORT_PREFIX; eksporten
    // må plukke opp nøyaktig de samme nøklene.
    expect(EXPORT_PREFIX).toBe('sundaylicks_')
    const keys = {
      sundaylicks_progress: '1',
      sundaylicks_daily: '2',
      sundaylicks_user_id: 'u_x',
      sundaylicks_view_ove: '{"ts":1}',
    }
    const bundle = collectExportData(fromMap(keys))
    for (const k of Object.keys(keys)) {
      expect(bundle.data).toHaveProperty(k.slice(EXPORT_PREFIX.length))
    }
  })

  it('hopper over en nøkkel som er BARE prefikset', () => {
    const bundle = collectExportData(fromMap({ sundaylicks_: 'rart' }))
    expect(Object.keys(bundle.data)).toEqual(['progress', 'collections', 'session', 'prefs'])
  })
})
