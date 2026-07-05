'use client'

import { useMemo } from 'react'
import type { LickNote } from '@/types/lick'
import type { Feedback } from '@/lib/useWaitMode'
import { isBlackKey, pitchClass, noteName } from '@/lib/music'
import { cn } from '@/lib/cn'

const WHITE_W = 34 // px, comfortable touch target
const BLACK_W = 20
const EPS = 1e-6

const HIT = '#6BD08A'
const MISS = '#C7534E'

interface Props {
  /** Transposed + hand-filtered notes (the ones that actually play). */
  notes: LickNote[]
  currentBeat: number
  /** Wait-mode: notes the player should hit right now (outlined). */
  expected?: Set<number>
  /** Wait-mode: transient hit/miss feedback per pressed key. */
  feedback?: Map<number, Feedback>
  /** Make keys playable — click/tap feeds a note-on. */
  onKeyPress?: (midi: number) => void
}

function padToC(min: number, max: number): [number, number] {
  let lo = min
  while (pitchClass(lo) !== 0) lo--
  let hi = max
  while (pitchClass(hi) !== 0) hi++
  if (hi - lo < 18) hi = lo + 18
  return [lo, hi]
}

export function Keyboard({ notes, currentBeat, expected, feedback, onKeyPress }: Props) {
  const [lo, hi] = useMemo(() => {
    // Include expected (wait-mode) pitches in the range so targets are visible.
    const ps = notes.map((n) => n.p)
    if (expected) ps.push(...expected)
    if (ps.length === 0) return [60, 72] as [number, number]
    return padToC(Math.min(...ps), Math.max(...ps))
  }, [notes, expected])

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

  // Resolve the fill/glow for a key: feedback > active(playing) > default.
  const fillFor = (m: number, black: boolean): { bg?: string; glow?: string } => {
    const fb = feedback?.get(m)
    if (fb) return { bg: fb === 'hit' ? HIT : MISS, glow: fb === 'hit' ? HIT : MISS }
    const hand = active.get(m)
    if (hand) {
      const c = hand === 'R' ? 'var(--color-amber)' : 'var(--color-sea)'
      return { bg: c, glow: c }
    }
    return black ? { bg: 'var(--color-black-key)' } : {}
  }

  const isTarget = (m: number) => expected?.has(m) ?? false

  return (
    <div className="scroll-x rounded-xl border border-[var(--color-border)] bg-[var(--color-raised)] p-3">
      <div className="relative mx-auto h-40 select-none" style={{ width: whites.length * WHITE_W }}>
        {whites.map((m, i) => {
          const { bg, glow } = fillFor(m, false)
          return (
            <div
              key={m}
              data-midi={m}
              onPointerDown={onKeyPress ? () => onKeyPress(m) : undefined}
              className={cn(
                'absolute top-0 h-40 rounded-b-md border border-[#0000002e] transition-colors duration-75',
                bg ? 'shadow-[0_0_18px_2px_var(--tw-shadow-color)]' : 'bg-[var(--color-ivory)]',
                onKeyPress && 'cursor-pointer',
                isTarget(m) && 'ring-2 ring-inset ring-[var(--color-amber)]',
              )}
              style={{
                left: i * WHITE_W,
                width: WHITE_W - 1,
                backgroundColor: bg,
                // @ts-expect-error CSS var for the tailwind shadow-color token
                '--tw-shadow-color': glow,
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
        {whites.map((m, i) => {
          if (!isBlackKey(m + 1)) return null
          const bm = m + 1
          const { bg, glow } = fillFor(bm, true)
          const lit = bg && bg !== 'var(--color-black-key)'
          return (
            <div
              key={bm}
              data-midi={bm}
              onPointerDown={onKeyPress ? () => onKeyPress(bm) : undefined}
              className={cn(
                'absolute top-0 z-10 h-24 rounded-b-md transition-colors duration-75',
                lit ? 'shadow-[0_0_16px_2px_var(--tw-shadow-color)]' : '',
                onKeyPress && 'cursor-pointer',
                isTarget(bm) && 'ring-2 ring-inset ring-[var(--color-amber)]',
              )}
              style={{
                left: (i + 1) * WHITE_W - BLACK_W / 2,
                width: BLACK_W,
                backgroundColor: bg,
                // @ts-expect-error CSS var for the tailwind shadow-color token
                '--tw-shadow-color': glow ?? 'transparent',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
