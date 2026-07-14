import { describe, it, expect } from 'vitest'
import { chordPitchClasses, pitchClass } from '@/lib/music'
import {
  STANDARD_TUNING,
  openness,
  shapePitches,
  shapesFor,
  type Shape,
} from './chord-shapes'

// The grip library's correctness hinges on two invariants: every registered
// shape sounds ONLY chord tones (with root + third present), and lookups order
// open grips before barres. Both are checked across the whole library so a
// data typo in one fret can never slip through.

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** Sounding pitch classes of a grip. */
const pcsOf = (s: Shape) => new Set(shapePitches(s).map(pitchClass))

/** Semitone offset of a quality's third slot (sus tones fill it). */
const THIRD: Record<string, number> = { '': 4, m: 3, '7': 4, maj7: 4, m7: 3, sus4: 5, sus2: 2, add9: 4 }

function expectValidGrip(shape: Shape, root: number, q: string) {
  const chordPcs = new Set(chordPitchClasses(root, q))
  const grip = pcsOf(shape)
  // Every sounded string is a chord tone (subset — a grip may omit the fifth,
  // like open C7), and the defining tones are present.
  for (const p of grip) expect(chordPcs.has(p), `foreign tone pc ${p} in ${root}${q}`).toBe(true)
  expect(grip.has(pitchClass(root)), `root missing in ${root}${q}`).toBe(true)
  if (q in THIRD) {
    expect(grip.has(pitchClass(root + THIRD[q])), `third missing in ${root}${q}`).toBe(true)
  }
}

describe('shapesFor — every open grip sounds only chord tones', () => {
  // The full open library, by (root, quality).
  const combos: [number, string][] = [
    [PC.E, ''], [PC.E, 'm'], [PC.E, '7'], [PC.E, 'm7'], [PC.E, 'sus4'],
    [PC.A, ''], [PC.A, 'm'], [PC.A, '7'], [PC.A, 'maj7'], [PC.A, 'm7'], [PC.A, 'sus4'], [PC.A, 'sus2'],
    [PC.D, ''], [PC.D, 'm'], [PC.D, '7'], [PC.D, 'm7'], [PC.D, 'sus4'],
    [PC.C, ''], [PC.C, 'maj7'], [PC.C, '7'], [PC.C, 'add9'],
    [PC.G, ''], [PC.G, '7'],
  ]
  for (const [root, q] of combos) {
    it(`${root}${q || 'maj'} resolves to valid grips`, () => {
      const shapes = shapesFor(root, q)
      expect(shapes.length).toBeGreaterThan(0)
      for (const s of shapes) expectValidGrip(s, root, q)
    })
  }
})

describe('shapesFor — barre derivations', () => {
  it('F major gets an E-form barre at fret 1', () => {
    const shapes = shapesFor(PC.F, '')
    expect(shapes.length).toBeGreaterThan(0)
    const eForm = shapes.find((s) => s.frets[0] === 1)
    expect(eForm).toBeDefined()
    expect(eForm!.frets).toEqual([1, 3, 3, 2, 1, 1])
    expect(eForm!.baseFret).toBe(1)
    expectValidGrip(eForm!, PC.F, '')
  })

  it('Bb major gets an A-form barre at fret 1', () => {
    const shapes = shapesFor(10, '') // Bb
    const aForm = shapes.find((s) => s.frets[0] === 'x' && s.frets[1] === 1)
    expect(aForm).toBeDefined()
    expect(aForm!.frets).toEqual(['x', 1, 3, 3, 3, 1])
    expectValidGrip(aForm!, 10, '')
  })

  it('every root × barre quality resolves to at least one valid grip', () => {
    for (let root = 0; root < 12; root++) {
      for (const q of ['', 'm', '7', 'm7', 'sus4']) {
        const shapes = shapesFor(root, q)
        expect(shapes.length, `no grip for ${root}${q}`).toBeGreaterThan(0)
        for (const s of shapes) expectValidGrip(s, root, q)
      }
    }
  })

  it('open grips sort before barres (G major: open first)', () => {
    const shapes = shapesFor(PC.G, '')
    const first = shapes[0]
    expect(first.frets.some((f) => f === 0)).toBe(true) // the 320003 open grip
    expect(openness(shapes[0])).toBeGreaterThanOrEqual(openness(shapes[shapes.length - 1]))
  })

  it('colour qualities fall back to a playable core (Gadd9 → G grips)', () => {
    const shapes = shapesFor(PC.G, 'add9')
    expect(shapes.length).toBeGreaterThan(0)
    for (const s of shapes) expectValidGrip(s, PC.G, '') // simplified to the triad
  })

  it('unplayable qualities return [] (dim)', () => {
    expect(shapesFor(PC.C, 'dim')).toEqual([])
  })
})

describe('shapePitches', () => {
  it('open E major sounds E2 B2 E3 G#3 B3 E4', () => {
    const [e] = shapesFor(PC.E, '')
    expect(shapePitches(e)).toEqual([40, 47, 52, 56, 59, 64])
  })

  it('skips muted strings (open D sounds 4 notes)', () => {
    const [d] = shapesFor(PC.D, '')
    expect(shapePitches(d)).toEqual([50, 57, 62, 66])
  })

  it('respects an alternate tuning', () => {
    const [e] = shapesFor(PC.E, '')
    const dropD = [38, 45, 50, 55, 59, 64]
    expect(shapePitches(e, dropD)[0]).toBe(38)
  })

  it('standard tuning is E2 A2 D3 G3 B3 E4', () => {
    expect([...STANDARD_TUNING]).toEqual([40, 45, 50, 55, 59, 64])
  })
})

describe('openness', () => {
  it('open E beats the F barre', () => {
    const [e] = shapesFor(PC.E, '')
    const f = shapesFor(PC.F, '')[0]
    expect(openness(e)).toBeGreaterThan(openness(f))
  })

  it('a barre low on the neck beats the same barre high up', () => {
    const low: Shape = { frets: [1, 3, 3, 2, 1, 1], baseFret: 1 }
    const high: Shape = { frets: [8, 10, 10, 9, 8, 8], baseFret: 8 }
    expect(openness(low)).toBeGreaterThan(openness(high))
  })

  it('more open strings score higher', () => {
    const em: Shape = { frets: [0, 2, 2, 0, 0, 0], baseFret: 1 } // 4 open
    const am: Shape = { frets: ['x', 0, 2, 2, 1, 0], baseFret: 1 } // 2 open
    expect(openness(em)).toBeGreaterThan(openness(am))
  })
})
