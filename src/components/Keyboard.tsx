'use client'

import { useMemo } from 'react'
import type { LickNote } from '@/types/lick'
import { isBlackKey, pitchClass, noteName } from '@/lib/music'
import { cn } from '@/lib/cn'

const WHITE_W = 34 // px, comfortable touch target
const BLACK_W = 20
const EPS = 1e-6

interface Props {
  /** Transposed + hand-filtered notes (the ones that actually play). */
  notes: LickNote[]
  currentBeat: number
}

/** Round a midi down/up to the enclosing C so the keyboard starts/ends cleanly. */
function padToC(min: number, max: number): [number, number] {
  let lo = min
  while (pitchClass(lo) !== 0) lo--
  let hi = max
  while (pitchClass(hi) !== 0) hi++ // land on a C above the top note
  // Guarantee at least ~1.5 octaves of context.
  if (hi - lo < 18) hi = lo + 18
  return [lo, hi]
}

export function Keyboard({ notes, currentBeat }: Props) {
  const [lo, hi] = useMemo(() => {
    if (notes.length === 0) return [60, 72] as [number, number]
    const ps = notes.map((n) => n.p)
    return padToC(Math.min(...ps), Math.max(...ps))
  }, [notes])

  // Which midi are sounding right now, and by which hand (R wins ties → amber).
  const active = useMemo(() => {
    const m = new Map<number, 'L' | 'R'>()
    for (const n of notes) {
      if (n.t - EPS <= currentBeat && currentBeat < n.t + n.d - EPS) {
        if (n.h === 'R' || !m.has(n.p)) m.set(n.p, n.h)
      }
    }
    return m
  }, [notes, currentBeat])

  const whites: number[] = []
  for (let m = lo; m <= hi; m++) if (!isBlackKey(m)) whites.push(m)

  return (
    <div className="scroll-x rounded-xl border border-[var(--color-border)] bg-[var(--color-raised)] p-3">
      <div className="relative mx-auto h-40 select-none" style={{ width: whites.length * WHITE_W }}>
        {/* White keys */}
        {whites.map((m, i) => {
          const hand = active.get(m)
          return (
            <div
              key={m}
              className={cn(
                'absolute top-0 h-40 rounded-b-md border border-[#0000002e] transition-colors duration-75',
                hand
                  ? 'shadow-[0_0_18px_2px_var(--tw-shadow-color)]'
                  : 'bg-[var(--color-ivory)]',
              )}
              style={{
                left: i * WHITE_W,
                width: WHITE_W - 1,
                backgroundColor: hand === 'R' ? 'var(--color-amber)' : hand === 'L' ? 'var(--color-sea)' : undefined,
                // @ts-expect-error CSS var for the tailwind shadow-color token
                '--tw-shadow-color': hand === 'R' ? 'var(--color-amber)' : 'var(--color-sea)',
              }}
            >
              {pitchClass(m) === 0 && (
                <span className="pointer-events-none absolute bottom-1 left-0 right-0 text-center text-[10px] font-medium text-[#8a7c66]">
                  {noteName(m)}
                </span>
              )}
            </div>
          )
        })}
        {/* Black keys */}
        {whites.map((m, i) => {
          if (!isBlackKey(m + 1)) return null
          const bm = m + 1
          const hand = active.get(bm)
          return (
            <div
              key={bm}
              className={cn(
                'absolute top-0 z-10 h-24 rounded-b-md transition-colors duration-75',
                hand ? 'shadow-[0_0_16px_2px_var(--tw-shadow-color)]' : 'bg-[var(--color-black-key)]',
              )}
              style={{
                left: (i + 1) * WHITE_W - BLACK_W / 2,
                width: BLACK_W,
                backgroundColor: hand === 'R' ? 'var(--color-amber)' : hand === 'L' ? 'var(--color-sea)' : undefined,
                // @ts-expect-error CSS var for the tailwind shadow-color token
                '--tw-shadow-color': hand === 'R' ? 'var(--color-amber)' : 'var(--color-sea)',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
