// Tester for gripebrett-geometrien (ren, node-env). Dekker den portede
// bestPosition-logikken pluss det nye gitar-lag-arbeidet: utledet bånd,
// om-fingring ved transponering utenfor båndområdet, determinisme, kontinuitet
// og p = GUITAR_STANDARD[s] + f-invarianten.

import { describe, it, expect } from 'vitest'
import type { LickNote } from '@/types/lick'
import {
  GUITAR_STANDARD,
  BASS_EADG,
  MAX_FRET,
  bestPosition,
  derivedFret,
  fretPositions,
  assignStrings,
  fretboardLayout,
} from './fretting'

const R = (p: number, t: number, s?: number): LickNote => ({ p, t, d: 0.5, h: 'R', s })

describe('bestPosition — gitar standardstemming', () => {
  it('spiller lav E (40) som åpen lav-E-streng', () => {
    expect(bestPosition(40, GUITAR_STANDARD)).toEqual({ string: 0, fret: 0 })
  })

  it('spiller B3 (59) som åpen B-streng (index 4)', () => {
    expect(bestPosition(59, GUITAR_STANDARD)).toEqual({ string: 4, fret: 0 })
  })

  it('foretrekker det lave hjemme-båndet uten historikk (A2=45 → åpen A, ikke E-fret 5)', () => {
    expect(bestPosition(45, GUITAR_STANDARD)).toEqual({ string: 1, fret: 0 })
  })

  it('velger posisjonen nærmest prev når flere finnes', () => {
    // G3 (55): åpen G-streng (index 3) uten historikk.
    expect(bestPosition(55, GUITAR_STANDARD)).toEqual({ string: 3, fret: 0 })
    // Spiller høyt på D-strengen (index 2): kontinuitet holder oss der (fret 5).
    expect(bestPosition(55, GUITAR_STANDARD, { string: 2, fret: 4 })).toEqual({ string: 2, fret: 5 })
  })

  it('returnerer null under lav E og over øverste bånd', () => {
    expect(bestPosition(39, GUITAR_STANDARD)).toBeNull() // under åpen lav E
    expect(bestPosition(64 + 25, GUITAR_STANDARD)).toBeNull() // over høy-E fret 24
  })
})

describe('derivedFret', () => {
  it('utleder f = p − GUITAR_STANDARD[s]', () => {
    expect(derivedFret(R(45, 0, 0))).toBe(5) // A2 på lav-E-strengen = bånd 5
    expect(derivedFret(R(45, 0, 1))).toBe(0) // A2 på åpen A-streng = bånd 0
    expect(derivedFret(R(64, 0, 5))).toBe(0) // høy E åpen
  })

  it('kaster når noten mangler streng', () => {
    expect(() => derivedFret(R(60, 0))).toThrow()
  })
})

describe('fretPositions — invariant + om-fingring', () => {
  const open = [R(40, 0, 0), R(45, 1, 1), R(50, 2, 2)] // åpne E/A/D-strenger
  // Toner høyt nok til at også nedovertransponering holder seg spillbar.
  const notes = [R(52, 0, 1), R(57, 1, 1), R(60, 2, 2)]

  it('beholder forfattet fingersetting når alt er innenfor båndet (offset 0)', () => {
    expect(fretPositions(open, 0)).toEqual([
      { string: 0, fret: 0 },
      { string: 1, fret: 0 },
      { string: 2, fret: 0 },
    ])
  })

  it('holder invarianten p+offset = GUITAR_STANDARD[s] + f for spillbare offsets', () => {
    for (const offset of [-7, -3, 0, 4, 9]) {
      const pos = fretPositions(notes, offset)
      pos.forEach((pp, i) => {
        expect(GUITAR_STANDARD[pp.string] + pp.fret).toBe(notes[i].p + offset)
        expect(pp.fret).toBeGreaterThanOrEqual(0)
        expect(pp.fret).toBeLessThanOrEqual(MAX_FRET)
      })
    }
  })

  it('utløser om-fingring når et utledet bånd faller utenfor 0–15', () => {
    // Note lagret på lav-E-streng; +20 halvtoner ⇒ bånd 20 (>15) på lagret streng.
    const single = [R(40, 0, 0)]
    const kept = fretPositions(single, 0)
    expect(kept).toEqual([{ string: 0, fret: 0 }])
    const refingered = fretPositions(single, 20)
    // Om-fingret til en gyldig posisjon (ikke lengre bånd 20 på streng 0).
    expect(refingered[0].fret).toBeLessThanOrEqual(MAX_FRET)
    expect(GUITAR_STANDARD[refingered[0].string] + refingered[0].fret).toBe(60)
  })

  it('er deterministisk — samme input gir samme om-fingring', () => {
    const a = fretPositions(notes, 18)
    const b = fretPositions(notes, 18)
    expect(a).toEqual(b)
  })

  it('gir kontinuitet i om-fingret sekvens (ingen unødige strenghopp)', () => {
    // En stigende skala som tvinger om-fingring — påfølgende noter bør ikke
    // hoppe vilt i streng når de kan spilles nært forrige posisjon.
    const scale = [R(60, 0), R(62, 1), R(64, 2), R(65, 3)].map((n, i) => R(n.p, i, 0))
    const pos = fretPositions(scale, 12) // dytt ut av båndet på streng 0
    for (let i = 1; i < pos.length; i++) {
      expect(Math.abs(pos[i].string - pos[i - 1].string)).toBeLessThanOrEqual(2)
    }
  })
})

describe('assignStrings — forslag ved forfatting', () => {
  it('foreslår en streng for hver note, med p = GUITAR_STANDARD[s] + utledet bånd', () => {
    const notes = [R(40, 0), R(45, 1), R(52, 2)]
    const out = assignStrings(notes)
    out.forEach((n) => {
      expect(n.s).toBeTypeOf('number')
      expect(derivedFret(n)).toBeGreaterThanOrEqual(0)
      expect(derivedFret(n)).toBeLessThanOrEqual(MAX_FRET)
      expect(GUITAR_STANDARD[n.s!] + derivedFret(n)).toBe(n.p)
    })
  })

  it('fingersetter hendene uavhengig (bass og melodi drar ikke hverandre)', () => {
    const notes: LickNote[] = [
      { p: 40, t: 0, d: 1, h: 'L' },
      { p: 64, t: 0, d: 1, h: 'R' },
    ]
    const out = assignStrings(notes)
    expect(out[0].s).toBe(0) // lav E på lav-E-streng
    expect(out[1].s).toBe(5) // høy E på høy-E-streng
  })

  it('endrer ikke inn-notene (rene kopier)', () => {
    const notes = [R(40, 0)]
    const out = assignStrings(notes)
    expect(notes[0].s).toBeUndefined()
    expect(out[0]).not.toBe(notes[0])
  })
})

describe('bass — 4-strengs EADG (parametrisert tuning)', () => {
  it('spiller lav E1 (28) som åpen lav-E-streng', () => {
    expect(bestPosition(28, BASS_EADG)).toEqual({ string: 0, fret: 0 })
  })

  it('spiller G2 (43) som åpen G-streng (index 3)', () => {
    expect(bestPosition(43, BASS_EADG)).toEqual({ string: 3, fret: 0 })
  })

  it('derivedFret bruker bass-stemmingen (p − BASS_EADG[s])', () => {
    expect(derivedFret(R(33, 0, 0), BASS_EADG)).toBe(5) // A1 på lav-E-streng = bånd 5
    expect(derivedFret(R(33, 0, 1), BASS_EADG)).toBe(0) // A1 på åpen A-streng
    expect(derivedFret(R(43, 0, 3), BASS_EADG)).toBe(0) // G2 åpen
  })

  it('holder invarianten p+offset = BASS_EADG[s] + f for spillbare offsets', () => {
    const notes = [R(38, 0, 2), R(43, 1, 3), R(36, 2, 1)] // D2, G2, C2
    for (const offset of [-3, 0, 4, 7]) {
      const pos = fretPositions(notes, offset, BASS_EADG)
      pos.forEach((pp, i) => {
        expect(BASS_EADG[pp.string] + pp.fret).toBe(notes[i].p + offset)
        expect(pp.fret).toBeGreaterThanOrEqual(0)
        expect(pp.fret).toBeLessThanOrEqual(MAX_FRET)
      })
    }
  })

  it('om-fingrer når et utledet bånd sprenger 0–15 på lagret streng', () => {
    const single = [R(28, 0, 0)] // E1 på lav-E-streng
    const refingered = fretPositions(single, 20, BASS_EADG) // +20 ⇒ bånd 20 (>15) på streng 0
    expect(refingered[0].fret).toBeLessThanOrEqual(MAX_FRET)
    expect(BASS_EADG[refingered[0].string] + refingered[0].fret).toBe(48)
  })

  it('assignStrings foreslår en gyldig streng mot bass-stemmingen', () => {
    const notes = [R(28, 0), R(33, 1), R(43, 2)] // E1, A1, G2
    const out = assignStrings(notes, BASS_EADG)
    out.forEach((n) => {
      expect(n.s).toBeTypeOf('number')
      const f = derivedFret(n, BASS_EADG)
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThanOrEqual(MAX_FRET)
      expect(BASS_EADG[n.s!] + f).toBe(n.p)
    })
  })

  it('gitar-default er uendret når tuning ikke sendes (bakoverkompat)', () => {
    expect(derivedFret(R(45, 0, 0))).toBe(5) // A2 på lav-E-streng (GUITAR_STANDARD)
    expect(fretPositions([R(40, 0, 0)], 0)).toEqual([{ string: 0, fret: 0 }])
  })
})

describe('fretboardLayout — skjematisk plassering', () => {
  const W = 720
  const H = 200
  const layout = fretboardLayout(GUITAR_STANDARD, 15, W, H)

  it('gir én y per streng og fretCount+1 båndlinjer', () => {
    expect(layout.stringY).toHaveLength(6)
    expect(layout.fretX).toHaveLength(16) // 0..15
  })

  it('tegner den lave strengen (index 0) nederst (størst y)', () => {
    expect(layout.stringY[0]).toBeGreaterThan(layout.stringY[5])
  })

  it('sadelen (fret 0) ligger på venstre kant, siste bånd på høyre kant', () => {
    expect(layout.fretX[0]).toBe(0)
    expect(layout.fretX[15]).toBeCloseTo(W)
  })

  it('posOf: åpen note ligger på sadelen, grepet note sentreres mellom båndlinjer', () => {
    expect(layout.posOf(0, 0).x).toBe(layout.fretX[0])
    expect(layout.posOf(0, 3).x).toBeCloseTo((layout.fretX[2] + layout.fretX[3]) / 2)
    expect(layout.posOf(2, 5).y).toBe(layout.stringY[2])
  })

  it('klemmer streng/bånd utenfor området inn i gyldig rekkevidde', () => {
    expect(layout.posOf(-1, 0).y).toBe(layout.stringY[0])
    expect(layout.posOf(99, 0).y).toBe(layout.stringY[5])
    expect(layout.posOf(0, 99).x).toBeCloseTo((layout.fretX[14] + layout.fretX[15]) / 2)
  })
})
