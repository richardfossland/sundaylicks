'use client'

import { useState } from 'react'
import { NOTE_NAMES } from '@/lib/music'
import type { Key } from '@/lib/theory/keys'
import { cn } from '@/lib/cn'
import {
  RING,
  angleForIndex,
  describeDistance,
  describePivots,
  majorRing,
  pointOnCircle,
  relativeMinorOf,
} from './circleOfFifthsGeometry'

export interface CircleOfFifthsProps {
  from: Key
  to: Key
  onSelectFrom: (key: Key) => void
  onSelectTo: (key: Key) => void
  /**
   * Show the "til" selection affordance (target-picker toggle + distance/pivot
   * copy). Hide it in flows that only ever need one key (e.g. "vandre", where
   * `to` is always forced equal to `from`).
   */
  showTarget?: boolean
  className?: string
}

const AMBER = 'var(--color-amber)'
const SEA = 'var(--color-sea)'
const INK_ON_AMBER = 'var(--color-ink-on-amber)'
const INK_ON_SEA = 'var(--color-ink-on-sea)'

/**
 * Interactive circle-of-fifths chart. Outer ring = the 12 major keys; inner
 * ring = their relative minors. Click (or Enter/Space) a note to place the
 * "fra" or "til" endpoint — a small segmented toggle above the chart (only
 * shown when `showTarget`) picks which one the next click sets.
 */
export function CircleOfFifths({ from, to, onSelectFrom, onSelectTo, showTarget = true, className }: CircleOfFifthsProps) {
  const [active, setActive] = useState<'from' | 'to'>('from')

  const pick = (key: Key) => {
    if (showTarget && active === 'to') onSelectTo(key)
    else onSelectFrom(key)
  }

  const { size, center, outerRadius, innerRadius, outerButton, innerButton } = RING
  const roots = majorRing()

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {showTarget && (
        <div
          role="group"
          aria-label="Velg om neste klikk setter fra- eller til-toneart"
          className="flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] p-1 text-sm"
        >
          <button
            type="button"
            aria-pressed={active === 'from'}
            onClick={() => setActive('from')}
            className={cn(
              'rounded-full px-3.5 py-1.5 font-medium transition-colors',
              active === 'from' ? 'bg-[var(--color-amber)] text-[var(--color-ink-on-amber)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
            )}
          >
            Fra
          </button>
          <button
            type="button"
            aria-pressed={active === 'to'}
            onClick={() => setActive('to')}
            className={cn(
              'rounded-full px-3.5 py-1.5 font-medium transition-colors',
              active === 'to' ? 'bg-[var(--color-sea)] text-[var(--color-ink-on-sea)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
            )}
          >
            Til
          </button>
        </div>
      )}

      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[300px]" role="group" aria-label="Kvintsirkel">
        {roots.map((root, i) => {
          const angle = angleForIndex(i)
          const outerPos = pointOnCircle(center, center, outerRadius, angle)
          const innerRoot = relativeMinorOf(root)
          const innerPos = pointOnCircle(center, center, innerRadius, angle)

          const isFromMajor = from.root === root && from.mode === 'major'
          const isToMajor = showTarget && to.root === root && to.mode === 'major'
          const isFromMinor = from.root === innerRoot && from.mode === 'minor'
          const isToMinor = showTarget && to.root === innerRoot && to.mode === 'minor'

          const majorFill = isFromMajor ? AMBER : isToMajor ? SEA : 'var(--color-raised)'
          const majorText = isFromMajor ? INK_ON_AMBER : isToMajor ? INK_ON_SEA : 'var(--color-ivory)'
          const minorFill = isFromMinor ? AMBER : isToMinor ? SEA : 'var(--color-scene)'
          const minorText = isFromMinor ? INK_ON_AMBER : isToMinor ? INK_ON_SEA : 'var(--color-muted)'

          return (
            <g key={root}>
              <g
                role="button"
                tabIndex={0}
                aria-label={`${NOTE_NAMES[root]}-dur`}
                aria-pressed={isFromMajor || isToMajor}
                className="cursor-pointer outline-none"
                onClick={() => pick({ root, mode: 'major' })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    pick({ root, mode: 'major' })
                  }
                }}
              >
                <circle cx={outerPos.x} cy={outerPos.y} r={outerButton} fill={majorFill} stroke="var(--color-border)" strokeWidth={1.5} />
                <text x={outerPos.x} y={outerPos.y} textAnchor="middle" dominantBaseline="central" fill={majorText} className="pointer-events-none select-none text-[13px] font-semibold">
                  {NOTE_NAMES[root]}
                </text>
              </g>

              <g
                role="button"
                tabIndex={0}
                aria-label={`${NOTE_NAMES[innerRoot]}-moll`}
                aria-pressed={isFromMinor || isToMinor}
                className="cursor-pointer outline-none"
                onClick={() => pick({ root: innerRoot, mode: 'minor' })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    pick({ root: innerRoot, mode: 'minor' })
                  }
                }}
              >
                <circle cx={innerPos.x} cy={innerPos.y} r={innerButton} fill={minorFill} stroke="var(--color-border)" strokeWidth={1} />
                <text x={innerPos.x} y={innerPos.y} textAnchor="middle" dominantBaseline="central" fill={minorText} className="pointer-events-none select-none text-[10px] font-medium">
                  {NOTE_NAMES[innerRoot]}m
                </text>
              </g>
            </g>
          )
        })}
      </svg>

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm">
          <span style={{ color: AMBER }}>
            {NOTE_NAMES[from.root]}
            {from.mode === 'minor' ? 'm' : ''}
          </span>
          {showTarget && (
            <>
              <span className="text-[var(--color-muted)]"> → </span>
              <span style={{ color: SEA }}>
                {NOTE_NAMES[to.root]}
                {to.mode === 'minor' ? 'm' : ''}
              </span>
            </>
          )}
        </p>
        {showTarget && (
          <>
            <p className="text-sm text-[var(--color-ivory)]">{describeDistance(from, to)}</p>
            <p className="max-w-xs text-xs text-[var(--color-muted)]">{describePivots(from, to)}</p>
          </>
        )}
      </div>
    </div>
  )
}
