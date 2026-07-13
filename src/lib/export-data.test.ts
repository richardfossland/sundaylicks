// Tester den rene eksport-samleren (node-env — getItem injiseres).

import { describe, expect, it } from 'vitest'
import { collectExportData } from './export-data'

function fromMap(m: Record<string, string>) {
  return (k: string): string | null => (k in m ? m[k] : null)
}

describe('collectExportData', () => {
  it('samler og parser alle fire nøklene', () => {
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

  it('korrupt JSON blir null i stedet for å kaste', () => {
    const bundle = collectExportData(fromMap({ sundaylicks_progress: '{oops' }))
    expect(bundle.data.progress).toBeNull()
  })

  it('har riktig konvolutt (app/version/exportedAt)', () => {
    const bundle = collectExportData(fromMap({}))
    expect(bundle.app).toBe('sundaylicks')
    expect(bundle.version).toBe(1)
    expect(typeof bundle.exportedAt).toBe('string')
    expect(Number.isNaN(Date.parse(bundle.exportedAt))).toBe(false)
  })
})
