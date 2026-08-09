// Invariant-vakthund for transponering av fretted-innhold (N3a-funn 2):
// før natt-runden 2026-08-09 tegnet 112 lick×toneart-kombinasjoner (85 gitar +
// 27 bass) FEIL tonehøyde (opptil 5 halvtoner — clamp-grenen i fretPositions)
// og gjorde vent-modus umulig å fullføre: forventet tone fantes ikke på brettet.
//
// Testen kjører HELE fretted-korpuset gjennom alle 12 tonearter og krever:
//   1. Hver foldet tone ligger i spillbart register [tuning[0], tuning[siste]+15].
//   2. Hver renderte posisjon oppfyller p = tuning[s] + f EKSAKT mot den
//      foldede (klingende!) tonen — lyd og bilde er enige.
//   3. Hver forventet vent-modus-tone er nåbar: minst én celle (s, f) på
//      brettet produserer nøyaktig den MIDI-verdien.
//   4. Uten transponering (offset 0, ingen folding) er notene referanse-like
//      med lick.notes (hurtigstien bevart).

import { describe, expect, it } from 'vitest'
import { SEED_GITAR_LICKS } from '@/data/seed-licks-gitar'
import { SEED_BASS_LICKS } from '@/data/seed-licks-bass'
import { transposedPlayableNotes } from './transpose'
import { fretPositions, MAX_FRET, TUNING_FOR } from './fretted/fretting'
import type { Lick } from '@/types/lick'

const FRETTED = [...SEED_GITAR_LICKS, ...SEED_BASS_LICKS] as unknown as Lick[]
const KEYS = Array.from({ length: 12 }, (_, k) => k)

describe('transposedPlayableNotes-invarianten (alle fretted licks × 12 tonearter)', () => {
  it('foldede toner er i register og posisjonene matcher klingende tone', () => {
    const offenders: string[] = []
    for (const lick of FRETTED) {
      const tuning = TUNING_FOR[lick.instrument ?? 'piano']
      const lo = tuning[0]
      const hi = tuning[tuning.length - 1] + MAX_FRET
      for (const key of KEYS) {
        const notes = transposedPlayableNotes(lick, key)
        const positions = fretPositions(notes, 0, tuning)
        notes.forEach((n, i) => {
          if (n.p < lo || n.p > hi) {
            offenders.push(`${lick.slug}→${key}: note ${i} p${n.p} utenfor [${lo},${hi}]`)
            return
          }
          const pos = positions[i]
          if (tuning[pos.string] + pos.fret !== n.p) {
            offenders.push(
              `${lick.slug}→${key}: note ${i} tegnes s${pos.string}f${pos.fret} (=${tuning[pos.string] + pos.fret}) men klinger p${n.p}`,
            )
          }
        })
      }
    }
    expect(offenders, offenders.slice(0, 20).join('\n')).toEqual([])
  })

  it('hver tone er nåbar på brettet (vent-modus kan alltid fullføres)', () => {
    const offenders: string[] = []
    for (const lick of FRETTED) {
      const tuning = TUNING_FOR[lick.instrument ?? 'piano']
      for (const key of KEYS) {
        for (const n of transposedPlayableNotes(lick, key)) {
          const reachable = tuning.some((open) => n.p >= open && n.p - open <= MAX_FRET)
          if (!reachable) offenders.push(`${lick.slug}→${key}: p${n.p} unåbar`)
        }
      }
    }
    expect(offenders, offenders.slice(0, 10).join('\n')).toEqual([])
  })

  it('offset 0 bevarer referanse-identitet (hurtigsti)', () => {
    for (const lick of FRETTED) {
      expect(transposedPlayableNotes(lick, lick.original_key)).toBe(lick.notes)
    }
  })
})
