import { describe, expect, it } from 'vitest'

import { analyzeLick, guessTonality } from './analyze'

describe('guessTonality', () => {
  it('reads major from a maj7 final chord', () => {
    expect(guessTonality([{ t: 0, d: 4, r: 0, q: 'maj7' }])).toBe('major')
  })

  it('reads minor from an m7 final chord', () => {
    expect(guessTonality([{ t: 0, d: 4, r: 9, q: 'm7' }])).toBe('minor')
  })

  it('defaults to major with no chords', () => {
    expect(guessTonality([])).toBe('major')
  })
})

describe('analyzeLick — ii-V-I', () => {
  const lick = {
    category: 'two-five-one',
    chords: [
      { t: 0, d: 2, r: 2, q: 'm7' }, // Dm7
      { t: 2, d: 2, r: 7, q: '7' }, // G7
      { t: 4, d: 4, r: 0, q: 'maj7' }, // Cmaj7
    ],
  }

  it('tags ii-V, ii-V-I, dominant + dominant-resolution, tonality major', () => {
    const { tonality, functions } = analyzeLick(lick)
    expect(tonality).toBe('major')
    expect(functions).toEqual(expect.arrayContaining(['ii-V', 'ii-V-I', 'dominant', 'dominant-resolution']))
  })
})

describe('analyzeLick — turnaround', () => {
  it('tags turnaround and reads major tonality from the final V chord', () => {
    const lick = {
      category: 'turnaround',
      chords: [
        { t: 0, d: 2, r: 0, q: 'maj7' },
        { t: 2, d: 2, r: 9, q: 'm7' },
        { t: 4, d: 2, r: 2, q: 'm7' },
        { t: 6, d: 2, r: 7, q: '7' },
      ],
    }
    const result = analyzeLick(lick)
    expect(result.functions).toContain('turnaround')
    expect(result.tonality).toBe('major')
  })
})

describe('analyzeLick — fill', () => {
  it('a single-chord fill is tagged fill-over-I', () => {
    const result = analyzeLick({ category: 'fill', chords: [{ t: 0, d: 4, r: 0, q: 'maj7' }] })
    expect(result.functions).toContain('fill-over-I')
  })

  it('a multi-chord fill is tagged plain fill', () => {
    const result = analyzeLick({
      category: 'fill',
      chords: [
        { t: 0, d: 2, r: 0, q: 'maj7' },
        { t: 2, d: 2, r: 5, q: 'maj7' },
      ],
    })
    expect(result.functions).toContain('fill')
    expect(result.functions).not.toContain('fill-over-I')
  })
})

describe('analyzeLick — ending / cadence', () => {
  it('tags an ending category as cadence', () => {
    const result = analyzeLick({
      category: 'ending',
      chords: [
        { t: 0, d: 2, r: 5, q: '' },
        { t: 2, d: 2, r: 0, q: '' },
      ],
    })
    expect(result.functions).toContain('cadence')
  })
})

describe('analyzeLick — passing diminished', () => {
  it('detects a diminished chord as a passing function', () => {
    const result = analyzeLick({
      category: 'run',
      chords: [
        { t: 0, d: 1, r: 1, q: 'dim7' },
        { t: 1, d: 1, r: 2, q: 'm7' },
      ],
    })
    expect(result.functions).toContain('passing')
  })
})
