'use client'

import { useState } from 'react'
import type { DiatonicChord } from '@/lib/theory/keys'
import { NOTE_NAMES, chordLabel } from '@/lib/music'
import { cn } from '@/lib/cn'

export interface ChordChoice {
  root: number
  quality: string
  roman?: string
}

// A small, readable palette — not every quality voicings.ts knows about, just
// the ones that make sense to hand-pick a chord/scale-degree over.
export const QUALITY_OPTIONS = ['maj7', 'm7', '7', 'm7b5', 'dim7', 'm', '', 'sus4', '9', 'm9', 'maj9'] as const

export type QualityOption = (typeof QUALITY_OPTIONS)[number]

// Plain-Norwegian names for the chord qualities — the raw jazz shorthand
// ("m7b5") means nothing to a beginner, so the custom-chord select spells it
// out. Kept exhaustive over QUALITY_OPTIONS (a colocated test guards this).
export const QUALITY_LABEL: Record<QualityOption, string> = {
  maj7: 'stor septim',
  m7: 'mollseptim',
  '7': 'dominant',
  m7b5: 'halvforminsket',
  dim7: 'forminsket',
  m: 'moll',
  '': 'dur',
  sus4: 'sus4',
  '9': 'dominant med none',
  m9: 'moll med none',
  maj9: 'stor septim med none',
}

/** Option text for the quality select: "maj7 — stor septim", or just the
 * friendly word when the symbol would be empty/identical ("dur", "sus4"). */
export function qualityOptionLabel(q: QualityOption): string {
  const label = QUALITY_LABEL[q]
  return q && q !== label ? `${q} — ${label}` : label
}

/**
 * Chord picker for "over denne akkorden": either one of the 7 diatonic
 * degrees of the current key, or a fully custom root + quality.
 */
export function SpiceChordPicker({
  diatonic,
  value,
  onChange,
}: {
  diatonic: DiatonicChord[]
  value: ChordChoice
  onChange: (c: ChordChoice) => void
}) {
  const [customMode, setCustomMode] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {diatonic.map((d) => {
          const active = !customMode && value.root === d.root && value.quality === d.quality
          return (
            <button
              key={d.degree}
              type="button"
              onClick={() => {
                setCustomMode(false)
                onChange({ root: d.root, quality: d.quality, roman: d.roman })
              }}
              aria-pressed={active}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'border-[var(--color-amber)] bg-[var(--color-amber)] text-[var(--color-ink-on-amber)]'
                  : 'border-[var(--color-border)] bg-[var(--color-raised)] text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
              )}
            >
              {chordLabel(d.root, d.quality)} <span className="opacity-70">{d.roman}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setCustomMode(true)}
          aria-pressed={customMode}
          className={cn(
            'rounded-full border border-dashed px-3.5 py-1.5 text-sm font-medium transition-colors',
            customMode
              ? 'border-[var(--color-sea)] bg-[var(--color-sea)]/15 text-[var(--color-sea)]'
              : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
          )}
        >
          Egendefinert…
        </button>
      </div>

      {customMode && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="flex flex-wrap gap-1">
            {NOTE_NAMES.map((n, i) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange({ root: i, quality: value.quality })}
                aria-pressed={value.root === i}
                className={cn(
                  'min-w-[2rem] rounded-full px-2 py-1 text-xs font-medium tabular-nums transition-colors',
                  value.root === i
                    ? 'bg-[var(--color-amber)] text-[var(--color-ink-on-amber)]'
                    : 'bg-[var(--color-raised)] text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <select
            value={value.quality}
            onChange={(e) => onChange({ root: value.root, quality: e.target.value })}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] px-3 py-1.5 text-sm text-[var(--color-ivory)] outline-none focus:border-[var(--color-amber)]"
          >
            {QUALITY_OPTIONS.map((q) => (
              <option key={q} value={q}>
                {qualityOptionLabel(q)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
