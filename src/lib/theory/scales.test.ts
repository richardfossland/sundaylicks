import { describe, expect, it } from 'vitest'

import { GLOSSARY_BY_ID } from '@/data/glossary'
import { QUALITY_OPTIONS } from '@/components/SpiceChordPicker'
import { pitchClass } from '../music'
import {
  CHORD_SCALES,
  SCALES,
  SCALE_BY_ID,
  ScaleDef,
  scalePitches,
  scalesForChord,
} from './scales'

describe('SCALES katalog', () => {
  it('har unike id-er', () => {
    const ids = SCALES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('har 17 skalaer i de fire gruppene', () => {
    expect(SCALES.length).toBe(17)
    const byGroup = (g: ScaleDef['group']) => SCALES.filter((s) => s.group === g).length
    expect(byGroup('grunn')).toBe(4)
    expect(byGroup('kirketoneart')).toBe(5)
    expect(byGroup('pentaton')).toBe(3)
    expect(byGroup('jazz')).toBe(5)
  })

  it('intervallene er stigende, innen 0–11 og starter på 0', () => {
    for (const s of SCALES) {
      expect(s.intervals[0]).toBe(0)
      for (let i = 0; i < s.intervals.length; i++) {
        expect(s.intervals[i]).toBeGreaterThanOrEqual(0)
        expect(s.intervals[i]).toBeLessThanOrEqual(11)
        if (i > 0) expect(s.intervals[i]).toBeGreaterThan(s.intervals[i - 1])
      }
    }
  })

  it('formelen har like mange trinn som intervaller', () => {
    for (const s of SCALES) {
      const tokens = s.formula.trim().split(/\s+/)
      expect(tokens.length).toBe(s.intervals.length)
    }
  })

  it('SCALE_BY_ID slår opp alle skalaer', () => {
    for (const s of SCALES) expect(SCALE_BY_ID.get(s.id)).toBe(s)
  })

  it('glossaryId peker bare på oppføringer som finnes i oppslagsverket', () => {
    for (const s of SCALES) {
      if (s.glossaryId) expect(GLOSSARY_BY_ID.has(s.glossaryId)).toBe(true)
    }
  })
})

describe('scalePitches', () => {
  it('grunntonen kommer først og antallet stemmer (octaves*len + 1)', () => {
    for (const s of SCALES) {
      const octaves = 2
      const p = scalePitches(0, s, octaves)
      expect(p.length).toBe(octaves * s.intervals.length + 1)
      expect(pitchClass(p[0])).toBe(0)
      // oktavtonen på toppen er grunntonen en oktav opp
      expect(pitchClass(p[p.length - 1])).toBe(0)
    }
  })

  it('alle toner ligger i skalaens toneklasser, for alle 12 røtter', () => {
    for (const s of SCALES) {
      const classes = new Set(s.intervals.map((i) => i % 12))
      for (let root = 0; root < 12; root++) {
        const p = scalePitches(root, s)
        for (const midi of p) {
          // toneklasse relativt grunntonen skal være i skalaen
          expect(classes.has(((pitchClass(midi) - root) + 12) % 12)).toBe(true)
        }
      }
    }
  })

  it('holder seg i et fornuftig MIDI-register for alle 12 røtter', () => {
    for (const s of SCALES) {
      for (let root = 0; root < 12; root++) {
        const p = scalePitches(root, s, 2)
        for (const midi of p) {
          expect(midi).toBeGreaterThanOrEqual(28)
          expect(midi).toBeLessThanOrEqual(100)
        }
      }
    }
  })
})

describe('CHORD_SCALES / scalesForChord', () => {
  it('alle refererte skala-id-er finnes i SCALE_BY_ID', () => {
    for (const fits of Object.values(CHORD_SCALES)) {
      for (const fit of fits) expect(SCALE_BY_ID.has(fit.scaleId)).toBe(true)
    }
  })

  it('rank er 1, 2 eller 3', () => {
    for (const fits of Object.values(CHORD_SCALES)) {
      for (const fit of fits) expect([1, 2, 3]).toContain(fit.rank)
    }
  })

  it('hver akkord har minst ett forslag med en ikke-tom «why»', () => {
    for (const fits of Object.values(CHORD_SCALES)) {
      expect(fits.length).toBeGreaterThan(0)
      for (const fit of fits) expect(fit.why.trim().length).toBeGreaterThan(0)
    }
  })

  it('alle QUALITY_OPTIONS (inkl. dur-treklang) har en mapping', () => {
    for (const q of QUALITY_OPTIONS) {
      expect(CHORD_SCALES[q]).toBeDefined()
      expect(scalesForChord(q).length).toBeGreaterThan(0)
    }
  })

  it('ukjent kvalitet faller tilbake til dur-treklangens forslag', () => {
    expect(scalesForChord('helt-ukjent-kvalitet')).toBe(CHORD_SCALES[''])
  })
})
