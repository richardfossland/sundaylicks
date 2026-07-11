import { describe, expect, it } from 'vitest'

import { submissionSchema } from '@/lib/validation'
import { pitchClass } from '../music'
import { SCALES, SCALE_BY_ID } from './scales'
import { scaleOverChordLick, scalePracticeLick, type ScalePattern } from './scale-licks'

const PATTERNS: ScalePattern[] = ['opp-ned', 'terser', 'grupper4']
// Et representativt utvalg: dur (7-tonig), pentaton (5), blues (6), dim (8-tonig).
const SAMPLE_IDS = ['dur', 'dorisk', 'pentaton-moll', 'blues', 'hel-halv-dim']

function rhClasses(scaleId: string): Set<number> {
  const s = SCALE_BY_ID.get(scaleId)!
  return new Set(s.intervals.map((i) => i % 12))
}

describe('scalePracticeLick', () => {
  it('høyrehåndstonene ligger i skalaen, for alle mønstre × utvalg × 12 røtter', () => {
    for (const id of SAMPLE_IDS) {
      const scale = SCALE_BY_ID.get(id)!
      const classes = rhClasses(id)
      for (const pattern of PATTERNS) {
        for (let root = 0; root < 12; root++) {
          const lick = scalePracticeLick(root, scale, pattern)
          for (const n of lick.notes) {
            if (n.h !== 'R') continue
            expect(classes.has(((pitchClass(n.p) - root) + 12) % 12)).toBe(true)
          }
        }
      }
    }
  })

  it('holder MIDI-register 28–100 og t+d ≤ beats', () => {
    for (const id of SAMPLE_IDS) {
      const scale = SCALE_BY_ID.get(id)!
      for (const pattern of PATTERNS) {
        for (let root = 0; root < 12; root++) {
          const lick = scalePracticeLick(root, scale, pattern)
          for (const n of lick.notes) {
            expect(n.p).toBeGreaterThanOrEqual(28)
            expect(n.p).toBeLessThanOrEqual(100)
            expect(n.t + n.d).toBeLessThanOrEqual(lick.beats + 1e-6)
          }
          for (const c of lick.chords) expect(c.t + c.d).toBeLessThanOrEqual(lick.beats + 1e-6)
        }
      }
    }
  })

  it('har dynamikk-spredning på minst 0,15 (aksenter vs. øvrige)', () => {
    for (const id of SAMPLE_IDS) {
      const scale = SCALE_BY_ID.get(id)!
      for (const pattern of PATTERNS) {
        const lick = scalePracticeLick(0, scale, pattern)
        const rh = lick.notes.filter((n) => n.h === 'R').map((n) => n.v ?? 0.8)
        expect(Math.max(...rh) - Math.min(...rh)).toBeGreaterThanOrEqual(0.15)
      }
    }
  })

  it('validerer mot lick-innhold-skjemaet (uten slug)', () => {
    for (const id of SAMPLE_IDS) {
      const scale = SCALE_BY_ID.get(id)!
      for (const pattern of PATTERNS) {
        const lick = scalePracticeLick(3, scale, pattern, { chord: { root: 3, quality: 'm7' } })
        expect(() => submissionSchema.parse(lick)).not.toThrow()
      }
    }
  })

  it('tagger med skala, id og mønster', () => {
    const lick = scalePracticeLick(0, SCALE_BY_ID.get('dorisk')!, 'terser')
    expect(lick.tags).toEqual(['skala', 'dorisk', 'terser'])
    expect(lick.kind).toBe('scale')
  })
})

describe('scaleOverChordLick', () => {
  it('legger akkorden i overlay-en og validerer — med dim7→dim overlay-trygghet', () => {
    for (let root = 0; root < 12; root++) {
      const lick = scaleOverChordLick(root, SCALE_BY_ID.get('hel-halv-dim')!, { root, quality: 'dim7' })
      // dim7 finnes ikke i music.ts' overlay-vokabular → må mappes til dim.
      for (const c of lick.chords) expect(c.q).toBe('dim')
      expect(() => submissionSchema.parse(lick)).not.toThrow()
    }
  })

  it('høyrehånd holder seg i skalaen og venstrehånd har innhold', () => {
    const scale = SCALE_BY_ID.get('dorisk')!
    const classes = rhClasses('dorisk')
    const lick = scaleOverChordLick(2, scale, { root: 2, quality: 'm7' })
    const rh = lick.notes.filter((n) => n.h === 'R')
    const lh = lick.notes.filter((n) => n.h === 'L')
    expect(lh.length).toBeGreaterThan(0)
    for (const n of rh) expect(classes.has(((pitchClass(n.p) - 2) + 12) % 12)).toBe(true)
  })

  it('hver skala kan spilles over en dominant uten å sprenge registeret', () => {
    for (const scale of SCALES) {
      const lick = scaleOverChordLick(7, scale, { root: 7, quality: '7' })
      for (const n of lick.notes) {
        expect(n.p).toBeGreaterThanOrEqual(28)
        expect(n.p).toBeLessThanOrEqual(100)
      }
    }
  })
})
