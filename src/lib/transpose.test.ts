import { describe, expect, it } from 'vitest'
import type { Lick, LickChord, LickNote } from '@/types/lick'
import {
  labelForChord,
  nearestOffset,
  transposeChord,
  transposeNote,
  transposedChords,
  transposedNotes,
} from './transpose'

// Transponeringslaget er den eneste veien fra korpusets originaltoneart til det
// brukeren hører og ser. `transposedPlayableNotes` har egen testfil
// (transpose-playable.test.ts) — her testes grunnlaget den hviler på.

function note(over: Partial<LickNote> = {}): LickNote {
  return { p: 60, t: 0, d: 1, h: 'R', ...over }
}

function chord(over: Partial<LickChord> = {}): LickChord {
  return { t: 0, d: 4, r: 0, q: 'maj7', ...over }
}

function lick(over: Partial<Lick> = {}): Lick {
  return {
    id: 'test',
    slug: 'test',
    name: 'Test',
    description: null,
    category: 'run',
    genre: 'gospel',
    difficulty: 1,
    original_key: 0,
    default_bpm: 90,
    beats: 4,
    time_signature: '4/4',
    notes: [note({ p: 60 }), note({ p: 64, t: 1 }), note({ p: 67, t: 2 })],
    chords: [chord()],
    tags: [],
    status: 'published',
    ...over,
  }
}

describe('nearestOffset', () => {
  it('er null når tonearten ikke endres', () => {
    for (let k = 0; k < 12; k++) expect(nearestOffset(k, k)).toBe(0)
  })

  it('velger korteste vei — ikke alltid oppover', () => {
    expect(nearestOffset(0, 1)).toBe(1)
    expect(nearestOffset(0, 11)).toBe(-1) // ned én, ikke opp elleve
    expect(nearestOffset(11, 0)).toBe(1)
    expect(nearestOffset(9, 2)).toBe(5)
    expect(nearestOffset(2, 9)).toBe(-5)
  })

  it('nøyaktig 6 halvtoner går OPP (tritonus-grensa er ikke symmetrisk)', () => {
    expect(nearestOffset(0, 6)).toBe(6)
    expect(nearestOffset(6, 0)).toBe(6)
    expect(nearestOffset(7, 1)).toBe(6)
  })

  it('7 halvtoner opp blir 5 ned — første steg forbi grensa', () => {
    expect(nearestOffset(0, 7)).toBe(-5)
    expect(nearestOffset(5, 0)).toBe(-5)
  })

  it('ligger alltid i [−5, 6] og er kongruent med intervallet modulo 12', () => {
    for (let from = 0; from < 12; from++) {
      for (let to = 0; to < 12; to++) {
        const off = nearestOffset(from, to)
        expect(off, `${from}→${to}`).toBeGreaterThanOrEqual(-5)
        expect(off, `${from}→${to}`).toBeLessThanOrEqual(6)
        expect((((from + off) % 12) + 12) % 12, `${from}→${to}`).toBe(to)
      }
    }
  })

  it('tåler tonearter utenfor 0–11', () => {
    expect(nearestOffset(12, 12)).toBe(0)
    expect(nearestOffset(-1, 0)).toBe(1)
    expect(nearestOffset(0, 13)).toBe(1)
  })
})

describe('transposeNote', () => {
  it('flytter tonehøyden og lar alt annet stå', () => {
    const n = note({ p: 60, t: 1.5, d: 0.5, h: 'L', v: 0.7, s: 2 })
    expect(transposeNote(n, 3)).toEqual({ p: 63, t: 1.5, d: 0.5, h: 'L', v: 0.7, s: 2 })
  })

  it('muterer ikke inndata', () => {
    const n = note({ p: 60 })
    transposeNote(n, 5)
    expect(n.p).toBe(60)
  })

  it('holder absolutt MIDI — tonehøyden foldes IKKE til 0–11', () => {
    expect(transposeNote(note({ p: 60 }), -7).p).toBe(53)
    expect(transposeNote(note({ p: 108 }), 6).p).toBe(114)
  })
})

describe('transposeChord', () => {
  it('flytter grunntonen som tonehøydeklasse (wrap over oktavskillet)', () => {
    expect(transposeChord(chord({ r: 10 }), 4).r).toBe(2) // Bb + 4 = D
    expect(transposeChord(chord({ r: 1 }), -3).r).toBe(10) // C# − 3 = Bb
  })

  it('beholder kvaliteten og tidsfeltene', () => {
    const c = chord({ t: 2, d: 1.5, r: 5, q: 'm7b5' })
    expect(transposeChord(c, 2)).toEqual({ t: 2, d: 1.5, r: 7, q: 'm7b5', b: undefined })
  })

  it('flytter bass-tonen når den finnes', () => {
    expect(transposeChord(chord({ r: 0, b: 7 }), 5).b).toBe(0) // G + 5 = C
    expect(transposeChord(chord({ r: 0, b: 0 }), -1).b).toBe(11) // bass 0 er ikke «ingen bass»
  })

  it('lar bassen være undefined når den ikke finnes', () => {
    expect(transposeChord(chord({ r: 0 }), 5).b).toBeUndefined()
  })

  it('muterer ikke inndata', () => {
    const c = chord({ r: 0, b: 7 })
    transposeChord(c, 3)
    expect(c).toEqual({ t: 0, d: 4, r: 0, q: 'maj7', b: 7 })
  })

  it('gir alltid grunntone og bass i [0,11], uansett forskyvning', () => {
    for (let r = 0; r < 12; r++) {
      for (let off = -11; off <= 11; off++) {
        const out = transposeChord(chord({ r, b: r }), off)
        expect(out.r).toBeGreaterThanOrEqual(0)
        expect(out.r).toBeLessThanOrEqual(11)
        expect(out.b).toBe(out.r)
      }
    }
  })
})

describe('transposedNotes', () => {
  it('gir SAMME referanse tilbake når tonearten er uendret — snarveien memoiseringa hviler på', () => {
    const l = lick({ original_key: 5 })
    expect(transposedNotes(l, 5)).toBe(l.notes)
  })

  it('gir en ny array når tonearten endres', () => {
    const l = lick({ original_key: 0 })
    const out = transposedNotes(l, 2)
    expect(out).not.toBe(l.notes)
    expect(out.map((n) => n.p)).toEqual([62, 66, 69])
  })

  it('bruker korteste vei — C→B går ned, ikke opp', () => {
    const l = lick({ original_key: 0, notes: [note({ p: 60 })] })
    expect(transposedNotes(l, 11)[0].p).toBe(59)
  })

  it('muterer ikke licken', () => {
    const l = lick({ original_key: 0 })
    transposedNotes(l, 7)
    expect(l.notes.map((n) => n.p)).toEqual([60, 64, 67])
  })
})

describe('transposedChords', () => {
  it('gir SAMME referanse tilbake når tonearten er uendret', () => {
    const l = lick({ original_key: 3 })
    expect(transposedChords(l, 3)).toBe(l.chords)
  })

  it('flytter akkordene med samme forskyvning som notene', () => {
    const l = lick({ original_key: 0, chords: [chord({ r: 0, b: 4 }), chord({ r: 7, t: 2 })] })
    const out = transposedChords(l, 10) // −2 (korteste vei)
    expect(out.map((c) => c.r)).toEqual([10, 5])
    expect(out[0].b).toBe(2)
  })
})

describe('labelForChord', () => {
  it('skriver ut akkorden slik den vises i stripa', () => {
    expect(labelForChord(chord({ r: 0, q: '' }))).toBe('C')
    expect(labelForChord(chord({ r: 2, q: 'm7' }))).toBe('Dm7')
    expect(labelForChord(chord({ r: 0, q: '', b: 7 }))).toBe('C/G')
  })

  it('følger transponeringa — merkelappen er alltid enig med tonene', () => {
    const c = transposeChord(chord({ r: 0, q: 'maj7', b: 7 }), 5)
    expect(labelForChord(c)).toBe('Fmaj7/C')
  })
})
