// Regelen «hvilken lyd skal denne licken spilles med» — den bodde tidligere kun
// i Practice, så /bla, oppslagsverket og /spill spilte gitar- og bass-licks med
// piano-lyd. Nå er den ett sted, og testet her.

import { describe, expect, it } from 'vitest'
import { frettedInstrument, instrumentForLick } from './instruments'

describe('frettedInstrument', () => {
  it('gitar og bass bærer sin egen lyd', () => {
    expect(frettedInstrument('gitar')).toBe('gitar')
    expect(frettedInstrument('bass')).toBe('bass')
  })

  it('piano, tomt og ukjent krever ingenting', () => {
    expect(frettedInstrument('piano')).toBeNull()
    expect(frettedInstrument(undefined)).toBeNull()
    expect(frettedInstrument(null)).toBeNull()
    // Fritekst på DB-laget (0005_instrument.sql) — ukjente verdier må ikke
    // tvinge fram en lyd appen ikke har.
    expect(frettedInstrument('ukulele')).toBeNull()
  })
})

describe('instrumentForLick', () => {
  it('fretted lick vinner over brukerens valgte lyd', () => {
    expect(instrumentForLick('gitar', 'pad')).toBe('gitar')
    expect(instrumentForLick('bass', 'elpiano')).toBe('bass')
  })

  it('piano-lick spilles med brukerens valgte lyd', () => {
    expect(instrumentForLick('piano', 'pad')).toBe('pad')
    expect(instrumentForLick(undefined, 'elpiano')).toBe('elpiano')
  })
})
