import { describe, expect, it } from 'vitest'
import {
  CHORD_INTERVALS,
  KEY_NAMES,
  NOTE_NAMES,
  chordLabel,
  chordPitchClasses,
  isBlackKey,
  noteName,
  octaveOf,
  pitchClass,
  secondsPerBeat,
} from './music'

// music.ts er den mest importerte modulen i appen (25 importører): toneart-
// velgere, akkordstriper, tangentbrett, gripebrett, notasjon og eksport leser
// alle herfra. Den hadde likevel null egne tester — en feil her ville vist seg
// som «feil akkord overalt», ikke som én ødelagt komponent.

describe('NOTE_NAMES / KEY_NAMES', () => {
  it('dekker alle 12 tonehøydeklasser uten duplikater', () => {
    expect(NOTE_NAMES).toHaveLength(12)
    expect(new Set(NOTE_NAMES).size).toBe(12)
  })

  it('KEY_NAMES ER NOTE_NAMES — toneartvelgeren og notenavnene kan ikke gli fra hverandre', () => {
    expect(KEY_NAMES).toBe(NOTE_NAMES)
  })

  it('starter på C, slik at indeks == tonehøydeklasse', () => {
    expect(NOTE_NAMES[0]).toBe('C')
    expect(NOTE_NAMES[7]).toBe('G')
    expect(NOTE_NAMES[11]).toBe('B')
  })
})

describe('pitchClass', () => {
  it('mapper MIDI til 0–11', () => {
    expect(pitchClass(60)).toBe(0) // C4
    expect(pitchClass(61)).toBe(1)
    expect(pitchClass(71)).toBe(11)
    expect(pitchClass(72)).toBe(0)
  })

  it('håndterer negative tall (transponering kan gå under 0 før klemming)', () => {
    expect(pitchClass(-1)).toBe(11)
    expect(pitchClass(-12)).toBe(0)
    expect(pitchClass(-13)).toBe(11)
  })

  it('gir alltid et heltall i [0,11] over hele MIDI-området og litt til', () => {
    for (let m = -36; m <= 160; m++) {
      const pc = pitchClass(m)
      expect(Number.isInteger(pc)).toBe(true)
      expect(pc).toBeGreaterThanOrEqual(0)
      expect(pc).toBeLessThanOrEqual(11)
      expect(Math.abs((m - pc) % 12)).toBe(0) // abs: negativ modulo gir −0
    }
  })
})

describe('octaveOf / noteName', () => {
  it('bruker vitenskapelig notasjon (C4 = 60)', () => {
    expect(octaveOf(60)).toBe(4)
    expect(noteName(60)).toBe('C4')
  })

  it('treffer korpusets ytterpunkter (A0 = 21, C8 = 108 — validation.ts sitt spenn)', () => {
    expect(noteName(21)).toBe('A0')
    expect(noteName(108)).toBe('C8')
  })

  it('bytter oktav ved C, ikke ved A', () => {
    expect(noteName(59)).toBe('B3')
    expect(noteName(60)).toBe('C4')
    expect(octaveOf(0)).toBe(-1)
  })
})

describe('isBlackKey', () => {
  it('kjenner de fem svarte tangentene i oktaven', () => {
    const black = [1, 3, 6, 8, 10]
    for (let pc = 0; pc < 12; pc++) {
      expect(isBlackKey(60 + pc)).toBe(black.includes(pc))
    }
  })

  it('er oktav-uavhengig', () => {
    expect(isBlackKey(61)).toBe(isBlackKey(61 + 12))
    expect(isBlackKey(60)).toBe(isBlackKey(60 - 24))
  })
})

describe('chordLabel', () => {
  it('setter sammen grunntone + kvalitet ordrett', () => {
    expect(chordLabel(0, '')).toBe('C')
    expect(chordLabel(0, 'm7')).toBe('Cm7')
    expect(chordLabel(10, 'maj9')).toBe('Bbmaj9')
  })

  it('legger på skråstrek-bass når `bass` er oppgitt', () => {
    expect(chordLabel(0, '', 7)).toBe('C/G')
    expect(chordLabel(5, 'm7', 10)).toBe('Fm7/Bb')
  })

  it('bass = 0 (C) er IKKE «ingen bass» — falsy-fella', () => {
    expect(chordLabel(7, '', 0)).toBe('G/C')
  })

  it('utelater bassen ved undefined og null', () => {
    expect(chordLabel(2, 'm')).toBe('Dm')
    expect(chordLabel(2, 'm', undefined)).toBe('Dm')
    // DB-rader kan komme med eksplisitt null i `b`; koden vokter mot begge.
    expect(chordLabel(2, 'm', null as unknown as number)).toBe('Dm')
  })

  it('folder grunntone og bass utenfor 0–11 inn i oktaven', () => {
    expect(chordLabel(12, '')).toBe('C')
    expect(chordLabel(-1, '')).toBe('B')
    expect(chordLabel(0, '', 19)).toBe('C/G')
  })
})

describe('secondsPerBeat', () => {
  it('regner om tempo til sekunder', () => {
    expect(secondsPerBeat(60)).toBe(1)
    expect(secondsPerBeat(120)).toBe(0.5)
    expect(secondsPerBeat(90)).toBeCloseTo(0.6667, 4)
  })
})

describe('CHORD_INTERVALS', () => {
  const qualities = Object.keys(CHORD_INTERVALS)

  it('dekker hele kvalitets-paletten seed-korpuset bruker', () => {
    // Låser settet: en kvalitet som forsvinner herfra ville stille falt tilbake
    // til dur-treklang i chordPitchClasses (feil akkordtone-overlegg).
    expect(qualities.sort()).toEqual(
      [
        '',
        '5',
        '6',
        '7',
        '7sus4',
        '9',
        'add9',
        'aug',
        'dim',
        'm',
        'm6',
        'm7',
        'm7b5',
        'm9',
        'maj7',
        'maj9',
        'sus2',
        'sus4',
      ].sort(),
    )
  })

  it('starter hver kvalitet på grunntonen og bruker heltall i [0,11]', () => {
    for (const q of qualities) {
      const iv = CHORD_INTERVALS[q]
      expect(iv.length, q).toBeGreaterThan(0)
      expect(iv[0], q).toBe(0)
      expect(new Set(iv).size, q).toBe(iv.length)
      for (const i of iv) {
        expect(Number.isInteger(i), `${q}:${i}`).toBe(true)
        expect(i, `${q}:${i}`).toBeGreaterThanOrEqual(0)
        expect(i, `${q}:${i}`).toBeLessThanOrEqual(11)
      }
    }
  })

  it('har riktige intervaller for de bærende kvalitetene', () => {
    expect(CHORD_INTERVALS['']).toEqual([0, 4, 7])
    expect(CHORD_INTERVALS.m).toEqual([0, 3, 7])
    expect(CHORD_INTERVALS['7']).toEqual([0, 4, 7, 10])
    expect(CHORD_INTERVALS.maj7).toEqual([0, 4, 7, 11])
    expect(CHORD_INTERVALS.m7b5).toEqual([0, 3, 6, 10])
    expect(CHORD_INTERVALS.dim).toEqual([0, 3, 6])
    expect(CHORD_INTERVALS.aug).toEqual([0, 4, 8])
    expect(CHORD_INTERVALS['5']).toEqual([0, 7]) // power chord: ingen ters
  })

  it('moll-kvaliteter har liten ters, dur-kvaliteter stor', () => {
    for (const q of ['m', 'm6', 'm7', 'm9', 'm7b5', 'dim']) {
      expect(CHORD_INTERVALS[q], q).toContain(3)
      expect(CHORD_INTERVALS[q], q).not.toContain(4)
    }
    for (const q of ['', '6', '7', '9', 'maj7', 'maj9', 'add9', 'aug']) {
      expect(CHORD_INTERVALS[q], q).toContain(4)
      expect(CHORD_INTERVALS[q], q).not.toContain(3)
    }
  })

  it('sus-kvaliteter har verken liten eller stor ters', () => {
    for (const q of ['sus2', 'sus4', '7sus4', '5']) {
      expect(CHORD_INTERVALS[q], q).not.toContain(3)
      expect(CHORD_INTERVALS[q], q).not.toContain(4)
    }
  })
})

describe('chordPitchClasses', () => {
  it('transponerer intervallene til grunntonen, for hver kvalitet og hver toneart', () => {
    for (const q of Object.keys(CHORD_INTERVALS)) {
      for (let root = 0; root < 12; root++) {
        expect(chordPitchClasses(root, q), `${root}${q}`).toEqual(
          CHORD_INTERVALS[q].map((i) => (root + i) % 12),
        )
      }
    }
  })

  it('gir C-dur for C uten kvalitet', () => {
    expect(chordPitchClasses(0, '')).toEqual([0, 4, 7])
  })

  it('folder over oktavskillet', () => {
    expect(chordPitchClasses(10, '')).toEqual([10, 2, 5]) // Bb: Bb D F
    expect(chordPitchClasses(11, '7')).toEqual([11, 3, 6, 9]) // B7
  })

  it('faller tilbake til dur-treklang på ukjent kvalitet — aldri tomt overlegg', () => {
    expect(chordPitchClasses(0, 'ukjent-kvalitet')).toEqual([0, 4, 7])
    expect(chordPitchClasses(5, 'alt')).toEqual(chordPitchClasses(5, ''))
  })

  it('gir alltid gyldige tonehøydeklasser, også for grunntoner utenfor 0–11', () => {
    for (const root of [-13, -1, 0, 11, 12, 25]) {
      for (const pc of chordPitchClasses(root, 'm9')) {
        expect(pc).toBeGreaterThanOrEqual(0)
        expect(pc).toBeLessThanOrEqual(11)
      }
    }
  })
})
