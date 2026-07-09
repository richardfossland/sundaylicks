import { describe, expect, it } from 'vitest'
import { QUALITY_LABEL, QUALITY_OPTIONS, qualityOptionLabel } from './SpiceChordPicker'

describe('SpiceChordPicker quality labels', () => {
  it('has a non-empty friendly label for every quality option', () => {
    for (const q of QUALITY_OPTIONS) {
      expect(QUALITY_LABEL[q], `missing label for "${q}"`).toBeTruthy()
    }
  })

  it('renders an option label for every quality option', () => {
    for (const q of QUALITY_OPTIONS) {
      const label = qualityOptionLabel(q)
      expect(label.length).toBeGreaterThan(0)
    }
  })

  it('shows only the friendly word when the symbol is empty or redundant', () => {
    expect(qualityOptionLabel('')).toBe('dur')
    expect(qualityOptionLabel('sus4')).toBe('sus4')
    expect(qualityOptionLabel('maj7')).toBe('maj7 — stor septim')
  })
})
