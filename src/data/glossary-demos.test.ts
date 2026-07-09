// Integritetstester for demo-registryet — samme mønster som glossary.test.ts
// (katalog-integritet) og validation.test.ts (per-note grenser). Kjøres i node
// (ingen DOM), så vi tester bare den rene dataen.

import { describe, expect, it } from 'vitest'
import { DEMO_BY_TERM_ID, GLOSSARY_DEMOS, type DemoChord, type DemoPhrase } from './glossary-demos'
import { GLOSSARY_BY_ID } from './glossary'

const EPS = 1e-6

/** Alle grep i en demo (keyboard-grepet, eller variantenes chord/phrase). */
function chordsIn(demo: (typeof GLOSSARY_DEMOS)[number]): DemoChord[] {
  if (demo.kind === 'keyboard') return [demo.chord]
  if (demo.kind === 'ab') return demo.variants.flatMap((v) => (v.chord ? [v.chord] : []))
  return []
}

function phrasesIn(demo: (typeof GLOSSARY_DEMOS)[number]): DemoPhrase[] {
  if (demo.kind === 'progression') return [demo.phrase]
  if (demo.kind === 'ab') return demo.variants.flatMap((v) => (v.phrase ? [v.phrase] : []))
  return []
}

describe('GLOSSARY_DEMOS-integritet', () => {
  it('har et rikt sett med demoer (30+)', () => {
    expect(GLOSSARY_DEMOS.length).toBeGreaterThanOrEqual(30)
  })

  it('alle termId-er finnes i GLOSSARY', () => {
    for (const demo of GLOSSARY_DEMOS) {
      expect(GLOSSARY_BY_ID.has(demo.termId), `ukjent termId «${demo.termId}»`).toBe(true)
    }
  })

  it('ingen duplikate termId-er (DEMO_BY_TERM_ID dekker alle)', () => {
    const ids = GLOSSARY_DEMOS.map((d) => d.termId)
    expect(new Set(ids).size).toBe(ids.length)
    expect(DEMO_BY_TERM_ID.size).toBe(ids.length)
  })

  it('alle captions er ikke-tomme', () => {
    for (const demo of GLOSSARY_DEMOS) {
      expect(demo.caption.trim().length, demo.termId).toBeGreaterThan(0)
    }
  })

  it('alle toner ligger innenfor pianoet (MIDI 21–108)', () => {
    for (const demo of GLOSSARY_DEMOS) {
      for (const chord of chordsIn(demo)) {
        expect(chord.pitches.length, `${demo.termId}: tomt grep`).toBeGreaterThan(0)
        for (const p of chord.pitches) {
          expect(p, `${demo.termId}: tone ${p}`).toBeGreaterThanOrEqual(21)
          expect(p, `${demo.termId}: tone ${p}`).toBeLessThanOrEqual(108)
        }
      }
      for (const phrase of phrasesIn(demo)) {
        expect(phrase.notes.length, `${demo.termId}: tom frase`).toBeGreaterThan(0)
        for (const n of phrase.notes) {
          expect(n.p, `${demo.termId}: tone ${n.p}`).toBeGreaterThanOrEqual(21)
          expect(n.p, `${demo.termId}: tone ${n.p}`).toBeLessThanOrEqual(108)
        }
      }
    }
  })

  it('keyboard-demoer spenner høyst 25 halvtoner (passer på MiniKeyboard)', () => {
    for (const demo of GLOSSARY_DEMOS) {
      if (demo.kind !== 'keyboard') continue
      const ps = demo.chord.pitches
      expect(Math.max(...ps) - Math.min(...ps), demo.termId).toBeLessThanOrEqual(25)
    }
  })

  it('alle fraser holder seg innenfor beats (t + d ≤ beats)', () => {
    for (const demo of GLOSSARY_DEMOS) {
      for (const phrase of phrasesIn(demo)) {
        for (const n of phrase.notes) {
          expect(n.t + n.d, `${demo.termId}: note t=${n.t} d=${n.d}`).toBeLessThanOrEqual(phrase.beats + EPS)
        }
        for (const c of phrase.chords ?? []) {
          expect(c.t + c.d, `${demo.termId}: akkord t=${c.t} d=${c.d}`).toBeLessThanOrEqual(phrase.beats + EPS)
        }
      }
    }
  })

  it('ab-demoer har 2–4 varianter, hver med nøyaktig én av chord/phrase', () => {
    for (const demo of GLOSSARY_DEMOS) {
      if (demo.kind !== 'ab') continue
      expect(demo.variants.length, `${demo.termId}: antall varianter`).toBeGreaterThanOrEqual(2)
      expect(demo.variants.length, `${demo.termId}: antall varianter`).toBeLessThanOrEqual(4)
      for (const v of demo.variants) {
        const has = (v.chord ? 1 : 0) + (v.phrase ? 1 : 0)
        expect(has, `${demo.termId}: «${v.label}» må ha nøyaktig én av chord/phrase`).toBe(1)
        expect(v.label.trim().length, demo.termId).toBeGreaterThan(0)
      }
    }
  })
})
