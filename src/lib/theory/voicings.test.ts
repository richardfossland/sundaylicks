import { describe, expect, it } from 'vitest'

import { voicing } from './voicings'

describe('voicing — close', () => {
  it('C7 close is C4-E4-G4-Bb4 (60,64,67,70)', () => {
    expect(voicing(0, '7', 'close')).toEqual([60, 64, 67, 70])
  })

  it('Cm7 close is C4-Eb4-G4-Bb4 (60,63,67,70)', () => {
    expect(voicing(0, 'm7', 'close')).toEqual([60, 63, 67, 70])
  })

  it('roots are placed in the register nearest C4 (G lands below middle C, not an octave above)', () => {
    // nearestOffset(C,G) = +7 -> normalised to -5, so root sits at 55, not 67.
    expect(voicing(7, '7', 'close')).toEqual([55, 59, 62, 65])
  })
})

describe('voicing — drop2', () => {
  it('Cmaj7 drop2 drops the 2nd-from-top voice of the close voicing an octave', () => {
    // close = [60,64,67,71]; 2nd-from-top (67, the 5th) drops to 55.
    expect(voicing(0, 'maj7', 'drop2')).toEqual([55, 60, 64, 71])
  })
})

describe('voicing — shell', () => {
  it('Cmaj7 shell is a low root plus guide tones 3rd+7th, no 5th', () => {
    expect(voicing(0, 'maj7', 'shell')).toEqual([48, 64, 71])
  })
})

describe('voicing — rootless-a / rootless-b', () => {
  it('Cm7 rootless-a is 3-5-7-9 above the root, root omitted', () => {
    expect(voicing(0, 'm7', 'rootless-a')).toEqual([63, 67, 70, 74])
    expect(voicing(0, 'm7', 'rootless-a')).not.toContain(60) // no root
  })

  it('Cm7 rootless-b keeps the same pitch classes as rootless-a, different register', () => {
    const a = voicing(0, 'm7', 'rootless-a').map((p) => p % 12)
    const b = voicing(0, 'm7', 'rootless-b').map((p) => p % 12)
    expect(new Set(b)).toEqual(new Set(a))
    expect(voicing(0, 'm7', 'rootless-b')).toEqual([58, 62, 63, 67])
  })
})

describe('voicing — quartal', () => {
  it('stacks perfect 4ths (5 semitones apart) from the 3rd', () => {
    const v = voicing(0, '', 'quartal')
    expect(v).toEqual([64, 69, 74])
    expect(v[1] - v[0]).toBe(5)
    expect(v[2] - v[1]).toBe(5)
  })
})

describe('voicing — gospel', () => {
  it('spreads a low root, guide tones, and a 9th on top across ~3 octaves', () => {
    expect(voicing(0, '7', 'gospel')).toEqual([36, 48, 64, 70, 74])
  })
})

describe('voicing — general shape', () => {
  it('every style returns pitches within the piano range used by the app', () => {
    const styles = ['close', 'rootless-a', 'rootless-b', 'gospel', 'quartal', 'shell', 'drop2'] as const
    for (const style of styles) {
      for (const root of [0, 3, 6, 9, 11]) {
        const pitches = voicing(root, '7', style)
        expect(pitches.length).toBeGreaterThan(0)
        for (const p of pitches) {
          expect(p).toBeGreaterThanOrEqual(21)
          expect(p).toBeLessThanOrEqual(108)
        }
      }
    }
  })
})
