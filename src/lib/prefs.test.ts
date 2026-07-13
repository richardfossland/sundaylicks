// Tester de rene/persisterte delene av prefs (node-env — localStorage-shim der
// window kreves): PracticeDefaults-parsing + reel-autospill-standarden.

import { afterEach, describe, expect, it } from 'vitest'
import {
  parsePracticeDefaults,
  getReelAutoplay,
  setReelAutoplay,
  DEFAULT_PRACTICE_DEFAULTS,
} from './prefs'

describe('parsePracticeDefaults', () => {
  it('round-tripper gyldig blob', () => {
    const raw = JSON.stringify({ metronome: true, countIn: true })
    expect(parsePracticeDefaults(raw)).toEqual({ metronome: true, countIn: true })
  })

  it('manglende/null → defaults', () => {
    expect(parsePracticeDefaults(null)).toEqual(DEFAULT_PRACTICE_DEFAULTS)
  })

  it('korrupt JSON / delvis blob → defaults for feltene som mangler', () => {
    expect(parsePracticeDefaults('{oops')).toEqual(DEFAULT_PRACTICE_DEFAULTS)
    expect(parsePracticeDefaults(JSON.stringify({ metronome: true }))).toEqual({
      metronome: true,
      countIn: false,
    })
  })
})

describe('reel-autospill', () => {
  const store = new Map<string, string>()
  ;(globalThis as Record<string, unknown>).window = globalThis
  ;(globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  }

  afterEach(() => store.clear())

  it('er PÅ som standard når ingenting er lagret', () => {
    expect(getReelAutoplay()).toBe(true)
  })

  it('leser lagret AV', () => {
    setReelAutoplay(false)
    expect(getReelAutoplay()).toBe(false)
  })

  it('round-tripper på/av', () => {
    setReelAutoplay(false)
    expect(getReelAutoplay()).toBe(false)
    setReelAutoplay(true)
    expect(getReelAutoplay()).toBe(true)
  })
})
