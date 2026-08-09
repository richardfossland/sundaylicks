// Tester beslutningskjernen for strupingen av /api/submit (ren funksjon —
// ingen database, ingen klokke).

import { describe, expect, it } from 'vitest'
import {
  SUBMIT_LIMITS,
  checkSubmitRate,
  exceedsBodyLimit,
  windowStartIso,
  type SubmitLimits,
} from './rate-limit'

const LIMITS: SubmitLimits = { perUser: 10, global: 100, maxBodyBytes: 64 * 1024, windowMs: 86_400_000 }

describe('checkSubmitRate', () => {
  it('slipper gjennom når begge tellingene er under taket', () => {
    expect(checkSubmitRate({ user: 0, global: 0 }, LIMITS)).toEqual({ allowed: true })
    expect(checkSubmitRate({ user: 9, global: 99 }, LIMITS)).toEqual({ allowed: true })
  })

  it('avviser på per-bruker-taket når det er nådd (grensen er inklusiv)', () => {
    const verdict = checkSubmitRate({ user: 10, global: 0 }, LIMITS)
    expect(verdict.allowed).toBe(false)
    if (verdict.allowed) throw new Error('uventet')
    expect(verdict.reason).toBe('per-user')
    expect(verdict.message).toContain('10')
    expect(verdict.retryAfterSeconds).toBe(86_400)
  })

  it('avviser på det globale taket når det er nådd', () => {
    const verdict = checkSubmitRate({ user: 0, global: 100 }, LIMITS)
    expect(verdict.allowed).toBe(false)
    if (verdict.allowed) throw new Error('uventet')
    expect(verdict.reason).toBe('global')
  })

  it('lar det globale taket gå foran per-bruker-taket', () => {
    const verdict = checkSubmitRate({ user: 999, global: 999 }, LIMITS)
    expect(verdict.allowed).toBe(false)
    if (verdict.allowed) throw new Error('uventet')
    expect(verdict.reason).toBe('global')
  })

  it('bruker standardgrensene når ingen er oppgitt', () => {
    expect(checkSubmitRate({ user: SUBMIT_LIMITS.perUser - 1, global: 0 })).toEqual({ allowed: true })
    expect(checkSubmitRate({ user: SUBMIT_LIMITS.perUser, global: 0 }).allowed).toBe(false)
    expect(checkSubmitRate({ user: 0, global: SUBMIT_LIMITS.global }).allowed).toBe(false)
  })

  it('svarer på norsk', () => {
    const perUser = checkSubmitRate({ user: 10, global: 0 }, LIMITS)
    const global = checkSubmitRate({ user: 0, global: 100 }, LIMITS)
    if (perUser.allowed || global.allowed) throw new Error('uventet')
    expect(perUser.message).toMatch(/Prøv igjen/)
    expect(global.message).toMatch(/kvoten er brukt opp/)
  })
})

describe('exceedsBodyLimit', () => {
  it('godtar akkurat på grensen, avviser ett byte over', () => {
    expect(exceedsBodyLimit(LIMITS.maxBodyBytes, LIMITS)).toBe(false)
    expect(exceedsBodyLimit(LIMITS.maxBodyBytes + 1, LIMITS)).toBe(true)
    expect(exceedsBodyLimit(0, LIMITS)).toBe(false)
  })

  it('har 64 KB som standardtak', () => {
    expect(exceedsBodyLimit(65_536)).toBe(false)
    expect(exceedsBodyLimit(65_537)).toBe(true)
  })
})

describe('windowStartIso', () => {
  it('gir et ISO-tidspunkt ett vindu tilbake', () => {
    const now = Date.parse('2026-08-09T12:00:00.000Z')
    expect(windowStartIso(now, LIMITS)).toBe('2026-08-08T12:00:00.000Z')
  })
})
