// Fysisk/dataintegritets-vakthund for hele korpuset — feilklasser N3-granskingen
// fant som zod IKKE fanger (zod validerer hver note isolert):
//   1. Én streng kan bare klinge én tone om gangen (fretted). 28 tilfeller
//      eksisterte før natt-runden 2026-08-09 («la ALT ringe» på én streng).
//   2. Samme tangent/tonehøyde kan ikke klinge dobbelt i samme hånd — et nytt
//      anslag avslutter det forrige (re-attack er OK, overlapp er dataglipp).
//   3. Eksakte duplikat-anslag (samme p, t, h, s) er død data.
//   4. Navn skal være unike på tvers av alle tre korpus (kortene viser navn,
//      og to licks med samme navn er umulige å skille i biblioteket).

import { describe, expect, it } from 'vitest'
import { SEED_LICKS } from './seed-licks'
import { SEED_GITAR_LICKS } from './seed-licks-gitar'
import { SEED_BASS_LICKS } from './seed-licks-bass'

const ALL = [...SEED_LICKS, ...SEED_GITAR_LICKS, ...SEED_BASS_LICKS]
const EPS = 1e-6

describe('korpus-integritet (utover zod)', () => {
  it('fretted: ingen streng klinger to tonehøyder samtidig', () => {
    const offenders: string[] = []
    for (const lick of ALL) {
      if ((lick.instrument ?? 'piano') === 'piano') continue
      const byString = new Map<number, { p: number; t: number; d: number }[]>()
      for (const n of lick.notes) {
        if (n.s === undefined) continue
        const arr = byString.get(n.s) ?? []
        arr.push({ p: n.p, t: n.t, d: n.d })
        byString.set(n.s, arr)
      }
      for (const [s, notes] of byString) {
        notes.sort((a, b) => a.t - b.t)
        for (let i = 0; i < notes.length - 1; i++) {
          const a = notes[i]
          const b = notes[i + 1]
          if (a.p !== b.p && a.t + a.d > b.t + EPS) {
            offenders.push(`${lick.slug} s${s}: p${a.p}@${a.t} (d${a.d}) overlapper p${b.p}@${b.t}`)
          }
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('ingen tonehøyde klinger dobbelt i samme hånd', () => {
    const offenders: string[] = []
    for (const lick of ALL) {
      const byPitch = new Map<string, { t: number; d: number }[]>()
      for (const n of lick.notes) {
        const key = `${n.h}:${n.p}`
        const arr = byPitch.get(key) ?? []
        arr.push({ t: n.t, d: n.d })
        byPitch.set(key, arr)
      }
      for (const [key, notes] of byPitch) {
        notes.sort((a, b) => a.t - b.t)
        for (let i = 0; i < notes.length - 1; i++) {
          if (notes[i].t + notes[i].d > notes[i + 1].t + EPS) {
            offenders.push(`${lick.slug} ${key}: anslag @${notes[i].t} (d${notes[i].d}) overlapper @${notes[i + 1].t}`)
          }
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('ingen eksakte duplikat-anslag', () => {
    const offenders: string[] = []
    for (const lick of ALL) {
      const seen = new Set<string>()
      for (const n of lick.notes) {
        const key = `${n.p}:${n.t}:${n.h}:${n.s ?? ''}`
        if (seen.has(key)) offenders.push(`${lick.slug}: ${key}`)
        seen.add(key)
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('unike navn på tvers av korpusene', () => {
    const byName = new Map<string, string[]>()
    for (const lick of ALL) {
      const arr = byName.get(lick.name) ?? []
      arr.push(lick.slug)
      byName.set(lick.name, arr)
    }
    const dups = [...byName.entries()].filter(([, slugs]) => slugs.length > 1)
    expect(dups, dups.map(([n, s]) => `«${n}»: ${s.join(', ')}`).join('\n')).toEqual([])
  })
})
