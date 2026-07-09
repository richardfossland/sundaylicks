// Integritetstester for oppslagsverket — samme mønster som validation.test.ts
// (SEED_LICKS-iterasjon) og course-progress.test.ts (katalog-integritet).

import { describe, expect, it } from 'vitest'
import {
  GLOSSARY,
  GLOSSARY_BY_ID,
  GLOSSARY_CATEGORY_LABEL,
  GLOSSARY_CATEGORY_ORDER,
} from './glossary'
import { glossaryTermSchema } from '@/lib/validation'

describe('GLOSSARY-integritet', () => {
  it('har et rikt bibliotek (60+ oppføringer)', () => {
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(60)
  })

  it('alle oppføringer består glossaryTermSchema', () => {
    for (const entry of GLOSSARY) {
      const result = glossaryTermSchema.safeParse(entry)
      expect(result.success, `${entry.id}: ${JSON.stringify(result.error?.issues)}`).toBe(true)
    }
  })

  it('alle id-er er unike og GLOSSARY_BY_ID dekker alle', () => {
    const ids = GLOSSARY.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(GLOSSARY_BY_ID.size).toBe(ids.length)
  })

  it('ingen surface (term/alias, lowercaset) kolliderer på tvers av oppføringer', () => {
    const owner = new Map<string, string>()
    for (const entry of GLOSSARY) {
      for (const surface of [entry.term, ...(entry.aliases ?? [])]) {
        const key = surface.toLowerCase()
        const existing = owner.get(key)
        expect(existing, `«${surface}» finnes i både ${existing} og ${entry.id}`).toBeUndefined()
        owner.set(key, entry.id)
      }
    }
  })

  it('alle seeAlso-referanser løser og peker ikke på seg selv', () => {
    for (const entry of GLOSSARY) {
      for (const ref of entry.seeAlso ?? []) {
        expect(GLOSSARY_BY_ID.has(ref), `${entry.id} → ukjent seeAlso «${ref}»`).toBe(true)
        expect(ref).not.toBe(entry.id)
      }
    }
  })

  it('alle kategorier finnes i label-mappen og rekkefølgen dekker alt', () => {
    for (const entry of GLOSSARY) {
      expect(GLOSSARY_CATEGORY_LABEL[entry.category]).toBeTruthy()
      expect(GLOSSARY_CATEGORY_ORDER).toContain(entry.category)
    }
    // Hver kategori i rekkefølgen har minst én oppføring (ingen tomme seksjoner)
    for (const category of GLOSSARY_CATEGORY_ORDER) {
      expect(
        GLOSSARY.some((t) => t.category === category),
        `kategori «${category}» er tom`,
      ).toBe(true)
    }
  })
})
