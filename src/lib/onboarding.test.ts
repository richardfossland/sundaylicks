// Sannhetstabellen for onboarding-porten (ren funksjon — ingen storage/window).

import { describe, expect, it } from 'vitest'
import { shouldShowOnboarding } from './onboarding'

describe('shouldShowOnboarding', () => {
  it('fersk profil (ingenting satt) → vis', () => {
    expect(shouldShowOnboarding({ onboarded: false, seenOldIntro: false, practicedCount: 0 })).toEqual({
      show: true,
      migrateSilently: false,
    })
  })

  it('allerede onboarded → verken vis eller migrer', () => {
    expect(shouldShowOnboarding({ onboarded: true, seenOldIntro: false, practicedCount: 0 })).toEqual({
      show: false,
      migrateSilently: false,
    })
  })

  it('onboarded vinner selv om øvingslogg finnes → ingen migrering', () => {
    expect(shouldShowOnboarding({ onboarded: true, seenOldIntro: true, practicedCount: 5 })).toEqual({
      show: false,
      migrateSilently: false,
    })
  })

  it('gammelt intro-flagg → migrer stille (aldri vis)', () => {
    expect(shouldShowOnboarding({ onboarded: false, seenOldIntro: true, practicedCount: 0 })).toEqual({
      show: false,
      migrateSilently: true,
    })
  })

  it('har øvd minst én lick → migrer stille (aldri vis)', () => {
    expect(shouldShowOnboarding({ onboarded: false, seenOldIntro: false, practicedCount: 1 })).toEqual({
      show: false,
      migrateSilently: true,
    })
  })

  it('både gammelt flagg og øvingslogg → migrer stille', () => {
    expect(shouldShowOnboarding({ onboarded: false, seenOldIntro: true, practicedCount: 12 })).toEqual({
      show: false,
      migrateSilently: true,
    })
  })
})
