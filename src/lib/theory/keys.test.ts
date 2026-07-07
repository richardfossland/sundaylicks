import { describe, expect, it } from 'vitest'

import { chordAtDegree, cofDistance, diatonicChords, dominantKey, parallelKey, pivotChords, relativeKey, subdominantKey } from './keys'

const C_MAJOR = { root: 0, mode: 'major' as const }
const G_MAJOR = { root: 7, mode: 'major' as const }
const A_MINOR = { root: 9, mode: 'minor' as const }
const C_MINOR = { root: 0, mode: 'minor' as const }

describe('cofDistance', () => {
  it('C→G is one step (a fifth)', () => {
    expect(cofDistance(0, 7)).toBe(1)
  })

  it('is symmetric and zero for the same pitch class', () => {
    expect(cofDistance(0, 0)).toBe(0)
    expect(cofDistance(7, 0)).toBe(cofDistance(0, 7))
  })

  it('C→F# is the maximum distance (tritone, 6 steps either way)', () => {
    expect(cofDistance(0, 6)).toBe(6)
  })
})

describe('relativeKey / parallelKey', () => {
  it('relative minor of C major is A minor, and round-trips', () => {
    const rel = relativeKey(C_MAJOR)
    expect(rel).toEqual(A_MINOR)
    expect(relativeKey(rel)).toEqual(C_MAJOR)
  })

  it('parallel of C major is C minor', () => {
    expect(parallelKey(C_MAJOR)).toEqual(C_MINOR)
    expect(parallelKey(C_MINOR)).toEqual(C_MAJOR)
  })
})

describe('dominantKey / subdominantKey', () => {
  it('dominant of C major is G major; subdominant is F major', () => {
    expect(dominantKey(C_MAJOR)).toEqual(G_MAJOR)
    expect(subdominantKey(C_MAJOR)).toEqual({ root: 5, mode: 'major' })
  })
})

describe('diatonicChords — major', () => {
  it('gives the seven diatonic 7th chords of C major with I ii iii IV V vi vii° romans', () => {
    const chords = diatonicChords(C_MAJOR)
    expect(chords.map((c) => c.roman)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'])
    expect(chords.map((c) => c.root)).toEqual([0, 2, 4, 5, 7, 9, 11])
    expect(chords.map((c) => c.quality)).toEqual(['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'])
  })

  it('ii-V-I in C major is Dm7–G7–Cmaj7', () => {
    const ii = chordAtDegree(C_MAJOR, 2)
    const V = chordAtDegree(C_MAJOR, 5)
    const I = chordAtDegree(C_MAJOR, 1)
    expect(ii).toMatchObject({ root: 2, quality: 'm7' })
    expect(V).toMatchObject({ root: 7, quality: '7' })
    expect(I).toMatchObject({ root: 0, quality: 'maj7' })
  })
})

describe('diatonicChords — minor (natural vs harmonic)', () => {
  it('natural minor uses v (m7) and VII (7)', () => {
    const chords = diatonicChords(A_MINOR)
    expect(chords[0]).toMatchObject({ root: 9, quality: 'm7', roman: 'i' })
    expect(chords[4]).toMatchObject({ root: 4, quality: 'm7', roman: 'v' })
    expect(chords[6]).toMatchObject({ root: 7, quality: '7', roman: 'VII' })
  })

  it('harmonic minor borrows V7 and vii°7 (raised leading tone)', () => {
    const chords = diatonicChords(A_MINOR, { harmonic: true })
    expect(chords[4]).toMatchObject({ root: 4, quality: '7', roman: 'V' })
    expect(chords[6]).toMatchObject({ root: 7, quality: 'dim7', roman: 'vii°' })
    // i, ii, III, iv, VI are unaffected by the harmonic-minor borrowing.
    expect(chords[0]).toMatchObject({ root: 9, quality: 'm7' })
    expect(chords[1]).toMatchObject({ root: 11, quality: 'm7b5' })
  })
})

describe('pivotChords', () => {
  it('C major → G major share C, Em, Am (root+quality identical in both keys)', () => {
    const pivots = pivotChords(C_MAJOR, G_MAJOR)
    const asSet = new Set(pivots.map((p) => `${p.root}|${p.quality}`))
    expect(asSet.has('0|maj7')).toBe(true) // C
    expect(asSet.has('4|m7')).toBe(true) // Em
    expect(asSet.has('9|m7')).toBe(true) // Am
    expect(pivots).toHaveLength(3)
  })

  it('a key pivots with itself on all seven diatonic chords', () => {
    expect(pivotChords(C_MAJOR, C_MAJOR)).toHaveLength(7)
  })
})
