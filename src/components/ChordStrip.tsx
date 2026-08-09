'use client'

import type { LickChord } from '@/types/lick'
import { labelForChord } from '@/lib/transpose'
import { cn } from '@/lib/cn'

const EPS = 1e-6

interface Props {
  chords: LickChord[] // already transposed (roots are pitch classes)
  currentBeat: number
}

// NB: stripa la ut akkordene som like flex-celler og leste aldri licken sin
// taktlengde — `beats` var en ubrukt prop hos alle tre kallerne og er fjernet.
export function ChordStrip({ chords, currentBeat }: Props) {
  if (chords.length === 0) return null
  return (
    <div className="scroll-x rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
      <div className="flex gap-1" style={{ minWidth: '100%' }}>
        {chords.map((c, i) => {
          const active = c.t - EPS <= currentBeat && currentBeat < c.t + c.d - EPS
          return (
            <div
              key={i}
              className={cn(
                'flex h-14 items-center justify-center rounded-lg border px-2 font-display text-lg transition-colors duration-100',
                active
                  ? 'border-[var(--color-amber)] bg-[var(--color-amber)]/15 text-[var(--color-amber)]'
                  : 'border-[var(--color-border)] bg-[var(--color-raised)] text-[var(--color-ivory)]',
              )}
              style={{ flexGrow: c.d, flexBasis: 0 }}
            >
              {labelForChord(c)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
