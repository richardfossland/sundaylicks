// Varig vakthund: ingen to licks i seed-biblioteket får være nær-duplikater av
// hverandre (Jaccard ≥ 0.9 over transposisjons-invariante note-avtrykk).
// Terskelen er bevisst løsere enn generator-asserten (<0.75) som brukes når nye
// batcher lages — testen skal fange regresjoner, ikke smaksdommer.

import { describe, expect, it } from 'vitest'
import { SEED_LICKS } from './seed-licks'
import { SEED_GITAR_LICKS } from './seed-licks-gitar'
import { SEED_BASS_LICKS } from './seed-licks-bass'
import { fingerprint, jaccard } from '@/lib/lick-fingerprint'

const NEAR_DUPLICATE = 0.9

// Vakten dekker HELE biblioteket (piano + gitar + bass) — en bass-lick får ikke
// være nær-duplikat av en annen bass-, gitar- eller piano-lick heller.
const ALL_LICKS = [...SEED_LICKS, ...SEED_GITAR_LICKS, ...SEED_BASS_LICKS]

describe('seed-bibliotekets likhets-vakthund', () => {
  it('ingen par av licks er nær-duplikater (Jaccard ≥ 0.9)', () => {
    const prints = ALL_LICKS.map((l) => ({ slug: l.slug, fp: fingerprint(l.notes) }))
    const offenders: string[] = []
    for (let i = 0; i < prints.length; i++) {
      for (let j = i + 1; j < prints.length; j++) {
        const sim = jaccard(prints[i].fp, prints[j].fp)
        if (sim >= NEAR_DUPLICATE) {
          offenders.push(`${prints[i].slug} ↔ ${prints[j].slug} (${sim.toFixed(2)})`)
        }
      }
    }
    expect(offenders, offenders.join('; ')).toEqual([])
  })

  it('fingerprint er transposisjons-invariant (sanity)', () => {
    const notes = SEED_LICKS[0].notes
    const up4 = notes.map((n) => ({ ...n, p: n.p + 4 }))
    expect(jaccard(fingerprint(notes), fingerprint(up4))).toBe(1)
  })
})
