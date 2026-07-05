'use client'

import { useMemo } from 'react'
import type { LickNote, HandFilter } from '@/types/lick'
import { isBlackKey } from '@/lib/music'

const BEAT_W = 46 // px per beat
const ROW_H = 9 // px per semitone
const PAD = 2 // semitones of padding top/bottom

interface Props {
  notes: LickNote[] // transposed, BOTH hands (display shows muted hand as outline)
  hand: HandFilter
  beats: number
  currentBeat: number
}

export function PianoRoll({ notes, hand, beats, currentBeat }: Props) {
  const { lo, hi } = useMemo(() => {
    if (notes.length === 0) return { lo: 60, hi: 72 }
    const ps = notes.map((n) => n.p)
    return { lo: Math.min(...ps) - PAD, hi: Math.max(...ps) + PAD }
  }, [notes])

  const rows = hi - lo + 1
  const height = rows * ROW_H
  const width = beats * BEAT_W
  const yOf = (p: number) => (hi - p) * ROW_H

  return (
    <div className="scroll-x rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
      <svg width={width} height={height} className="block" role="img" aria-label="Pianorull">
        {/* Row backgrounds (subtle black-key shading) */}
        {Array.from({ length: rows }, (_, i) => {
          const p = hi - i
          return (
            <rect
              key={`bg${p}`}
              x={0}
              y={i * ROW_H}
              width={width}
              height={ROW_H}
              fill={isBlackKey(p) ? '#00000026' : 'transparent'}
            />
          )
        })}
        {/* Beat gridlines */}
        {Array.from({ length: beats + 1 }, (_, b) => (
          <line
            key={`g${b}`}
            x1={b * BEAT_W}
            y1={0}
            x2={b * BEAT_W}
            y2={height}
            stroke="var(--color-border)"
            strokeWidth={b % 4 === 0 ? 1.4 : 0.6}
          />
        ))}
        {/* Notes */}
        {notes.map((n, i) => {
          const muted = hand !== 'both' && n.h !== hand
          const color = n.h === 'R' ? 'var(--color-amber)' : 'var(--color-sea)'
          return (
            <rect
              key={i}
              x={n.t * BEAT_W + 1}
              y={yOf(n.p) + 0.5}
              width={Math.max(n.d * BEAT_W - 2, 3)}
              height={ROW_H - 1}
              rx={2}
              fill={muted ? 'transparent' : color}
              stroke={color}
              strokeWidth={muted ? 1 : 0}
              opacity={muted ? 0.5 : 1}
            />
          )
        })}
        {/* Playhead */}
        <line
          x1={currentBeat * BEAT_W}
          y1={0}
          x2={currentBeat * BEAT_W}
          y2={height}
          stroke="var(--color-ivory)"
          strokeWidth={1.5}
          opacity={0.85}
        />
      </svg>
    </div>
  )
}
