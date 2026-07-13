// Integritetstester for de kuraterte progresjonene (kilde: free-midi-chords,
// MIT — se header i progressions.ts). Kvalitetene MÅ finnes i music.ts-
// vokabularet: en ukjent kvalitet ville krasjet akkordtone-overlegget
// (chordPitchClasses) og gitt meningsløse voicing-forslag i Krydre.

import { describe, expect, it } from 'vitest'
import { CURATED_PROGRESSIONS, PROGRESSION_BY_ID } from './progressions'
import { CHORD_INTERVALS } from '@/lib/music'

describe('CURATED_PROGRESSIONS-integritet', () => {
  it('har et rikt utvalg (≥ 35)', () => {
    expect(CURATED_PROGRESSIONS.length).toBeGreaterThanOrEqual(35)
  })

  it('unike id-er og komplett oppslagskart', () => {
    const ids = CURATED_PROGRESSIONS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(PROGRESSION_BY_ID.size).toBe(ids.length)
  })

  it('alle steg har gyldig offset, kjent kvalitet og romertall', () => {
    for (const p of CURATED_PROGRESSIONS) {
      expect(p.steps.length, p.id).toBeGreaterThanOrEqual(2)
      expect(p.steps.length, p.id).toBeLessThanOrEqual(8)
      for (const s of p.steps) {
        expect(Number.isInteger(s.offset) && s.offset >= 0 && s.offset <= 11, `${p.id}: offset ${s.offset}`).toBe(true)
        expect(s.quality in CHORD_INTERVALS, `${p.id}: ukjent kvalitet «${s.quality}»`).toBe(true)
        expect(s.roman.length, p.id).toBeGreaterThan(0)
      }
    }
  })

  it('navn og mood er utfylt på norsk', () => {
    for (const p of CURATED_PROGRESSIONS) {
      expect(p.name.length, p.id).toBeGreaterThan(2)
      expect(p.mood.length, p.id).toBeGreaterThan(2)
    }
  })
})
