// Vakthund som manglet fram til kurateringsrunden 2026-07: hvert kurs-steg MÅ
// peke på en lick som faktisk finnes i seed-biblioteket. (course-progress.test.ts
// tester progresjonslogikken, men ingenting fanget en slettet/feilstavet slug —
// et dødt steg ville gitt et tomt kort i kursvisningen.)

import { describe, expect, it } from 'vitest'
import { CURATED_PATHS } from './curated-paths'
import { SEED_LICKS } from './seed-licks'
import { SEED_GITAR_LICKS } from './seed-licks-gitar'

describe('CURATED_PATHS-integritet', () => {
  const known = new Set([...SEED_LICKS, ...SEED_GITAR_LICKS].map((l) => l.slug))

  it('alle kurs-slugs finnes i SEED_LICKS', () => {
    for (const path of CURATED_PATHS) {
      for (const slug of path.slugs) {
        expect(known.has(slug), `${path.id}: ukjent slug «${slug}»`).toBe(true)
      }
    }
  })

  it('ingen kurs har duplikate steg', () => {
    for (const path of CURATED_PATHS) {
      expect(new Set(path.slugs).size, path.id).toBe(path.slugs.length)
    }
  })

  it('unike kurs-id-er og ikke-tomme kurs', () => {
    expect(new Set(CURATED_PATHS.map((p) => p.id)).size).toBe(CURATED_PATHS.length)
    for (const path of CURATED_PATHS) {
      expect(path.slugs.length, path.id).toBeGreaterThan(0)
    }
  })
})
