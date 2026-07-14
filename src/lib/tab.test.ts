import { describe, it, expect } from 'vitest'
import type { LickNote } from '@/types/lick'
import { buildTabNotes } from './tab'

// Ren TAB-bygging (node-env). Dekker onset-gruppering (akkord), str = 6 − streng,
// bånd fra fretPositions, pause-fylling og triol-klamring.

const N = (p: number, t: number, d: number, s: number, h: LickNote['h'] = 'R'): LickNote => ({
  p,
  t,
  d,
  h,
  s,
})

describe('buildTabNotes — grunnleggende mapping', () => {
  it('mapper en åpen lav-E-note til streng 6, bånd 0', () => {
    // MIDI 40 = åpen lav E, s = 0 → VexFlow str = 6 − 0 = 6.
    const { events } = buildTabNotes([N(40, 0, 1, 0)], 1)
    expect(events).toHaveLength(1)
    expect(events[0].rest).toBe(false)
    expect(events[0].positions).toEqual([{ str: 6, fret: 0 }])
    expect(events[0].duration).toBe('q')
  })

  it('utleder bånd fra streng: A2 (45) på lav-E-strengen (s=0) → bånd 5', () => {
    const { events } = buildTabNotes([N(45, 0, 1, 0)], 1)
    expect(events[0].positions).toEqual([{ str: 6, fret: 5 }])
  })

  it('grupperer samtidige toner til én akkord-hendelse, sortert lav→høy streng', () => {
    // Åpen G-akkord-fragment: lav E (s0), åpen G (s3), høy E (s5) på slag 0.
    const { events } = buildTabNotes([N(40, 0, 1, 0), N(55, 0, 1, 3), N(64, 0, 1, 5)], 1)
    expect(events).toHaveLength(1)
    expect(events[0].positions).toEqual([
      { str: 6, fret: 0 }, // lav E
      { str: 3, fret: 0 }, // G
      { str: 1, fret: 0 }, // høy E
    ])
  })
})

describe('buildTabNotes — pauser (kun spacing)', () => {
  it('fyller et gap før første note med pause-hendelser', () => {
    const { events } = buildTabNotes([N(40, 1, 1, 0)], 2)
    expect(events[0].rest).toBe(true)
    expect(events[0].positions).toEqual([])
    expect(events[events.length - 1].rest).toBe(false)
  })

  it('fyller haleslag etter siste note med pause', () => {
    const { events } = buildTabNotes([N(40, 0, 1, 0)], 2)
    const rests = events.filter((e) => e.rest)
    expect(rests.length).toBeGreaterThan(0)
  })
})

describe('buildTabNotes — trioler', () => {
  it('klamrer hver tredje triol-åttendedel som en gruppe', () => {
    const T = 1 / 3
    const notes = [
      N(40, 0, T, 0),
      N(45, T, T, 1),
      N(50, 2 * T, T, 2),
    ]
    const { events, tuplets } = buildTabNotes(notes, 1)
    expect(events.every((e) => e.triplet || e.rest)).toBe(true)
    expect(tuplets).toHaveLength(1)
    expect(tuplets[0]).toHaveLength(3)
  })
})
