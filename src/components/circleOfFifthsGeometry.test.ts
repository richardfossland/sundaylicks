import { describe, expect, it } from 'vitest'

import { chordLabel } from '@/lib/music'
import { pivotChords, type Key } from '@/lib/theory/keys'
import {
  angleForIndex,
  describeDistance,
  describePivots,
  indexOfPitchClass,
  majorRing,
  pointOnCircle,
  relativeMinorOf,
} from './circleOfFifthsGeometry'

const C_MAJOR: Key = { root: 0, mode: 'major' }
const G_MAJOR: Key = { root: 7, mode: 'major' }
const C_MINOR: Key = { root: 0, mode: 'minor' }
const A_MINOR: Key = { root: 9, mode: 'minor' }
const FSHARP_MAJOR: Key = { root: 6, mode: 'major' } // tritone from C — max cofDistance

describe('angleForIndex', () => {
  it('places index 0 at the top (0deg) and steps 30deg clockwise per position', () => {
    expect(angleForIndex(0)).toBe(0)
    expect(angleForIndex(1)).toBe(30)
    expect(angleForIndex(3)).toBe(90)
    expect(angleForIndex(6)).toBe(180)
  })
})

describe('pointOnCircle', () => {
  it('0deg is straight up, 90deg is to the right, 180deg is straight down', () => {
    const top = pointOnCircle(0, 0, 10, 0)
    expect(top.x).toBeCloseTo(0)
    expect(top.y).toBeCloseTo(-10)

    const right = pointOnCircle(0, 0, 10, 90)
    expect(right.x).toBeCloseTo(10)
    expect(right.y).toBeCloseTo(0)

    const bottom = pointOnCircle(0, 0, 10, 180)
    expect(bottom.x).toBeCloseTo(0)
    expect(bottom.y).toBeCloseTo(10)
  })

  it('is centred on (cx, cy)', () => {
    const p = pointOnCircle(50, 60, 10, 0)
    expect(p.x).toBeCloseTo(50)
    expect(p.y).toBeCloseTo(50)
  })
})

describe('indexOfPitchClass / majorRing', () => {
  it('matches the CIRCLE_OF_FIFTHS order: C, G, ..., F', () => {
    expect(indexOfPitchClass(0)).toBe(0) // C
    expect(indexOfPitchClass(7)).toBe(1) // G
    expect(indexOfPitchClass(5)).toBe(11) // F
  })

  it('majorRing has all 12 pitch classes, no duplicates', () => {
    const ring = majorRing()
    expect(ring).toHaveLength(12)
    expect(new Set(ring).size).toBe(12)
  })
})

describe('relativeMinorOf', () => {
  it('C major -> A minor', () => {
    expect(relativeMinorOf(0)).toBe(9)
  })
  it('G major -> E minor', () => {
    expect(relativeMinorOf(7)).toBe(4)
  })
})

describe('describeDistance', () => {
  it('flags the same key', () => {
    expect(describeDistance(C_MAJOR, C_MAJOR)).toBe('Samme toneart')
  })

  it('reports fifths-distance for an unrelated key', () => {
    expect(describeDistance(C_MAJOR, G_MAJOR)).toContain('1 kvint')
  })

  it('flags a parallel major/minor pair', () => {
    expect(describeDistance(C_MAJOR, C_MINOR)).toContain('parallell')
  })

  it('flags a relative major/minor pair', () => {
    expect(describeDistance(C_MAJOR, A_MINOR)).toContain('relativ')
  })

  it('pluralizes correctly for >1 step', () => {
    expect(describeDistance(C_MAJOR, FSHARP_MAJOR)).toContain('6 kvinter')
  })
})

describe('describePivots', () => {
  it('lists every pivot chord shared by both keys', () => {
    const pivots = pivotChords(C_MAJOR, G_MAJOR)
    expect(pivots.length).toBeGreaterThan(0)
    const text = describePivots(C_MAJOR, G_MAJOR)
    for (const p of pivots) {
      expect(text).toContain(chordLabel(p.root, p.quality))
    }
  })

  it('falls back to a secondary-dominant hint when there is no shared diatonic chord', () => {
    expect(pivotChords(C_MAJOR, FSHARP_MAJOR)).toHaveLength(0)
    expect(describePivots(C_MAJOR, FSHARP_MAJOR)).toContain('sekundærdominant')
  })
})
