'use client'

import { Play, Square, Repeat, Loader2, TrendingUp } from 'lucide-react'
import type { HandFilter } from '@/types/lick'
import { KEY_NAMES } from '@/lib/music'
import { cn } from '@/lib/cn'

interface Props {
  isPlaying: boolean
  isLoading: boolean
  onPlayToggle: () => void
  loop: boolean
  onLoopToggle: () => void
  ramp: boolean
  onRampToggle: () => void
  bpm: number
  defaultBpm: number
  onBpm: (bpm: number) => void
  targetKey: number
  onKey: (k: number) => void
  hand: HandFilter
  onHand: (h: HandFilter) => void
}

const HANDS: { id: HandFilter; label: string }[] = [
  { id: 'both', label: 'Begge' },
  { id: 'L', label: 'Venstre' },
  { id: 'R', label: 'Høyre' },
]

export function TransportBar(p: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      {/* Row 1: play + loop + tempo */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={p.onPlayToggle}
          disabled={p.isLoading}
          aria-label={p.isPlaying ? 'Stopp' : 'Spill'}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-amber)] text-[#171210] transition-transform active:scale-95 disabled:opacity-60"
        >
          {p.isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : p.isPlaying ? (
            <Square className="h-6 w-6" fill="currentColor" />
          ) : (
            <Play className="h-6 w-6" fill="currentColor" />
          )}
        </button>

        <button
          onClick={p.onLoopToggle}
          aria-pressed={p.loop}
          className={cn(
            'flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors',
            p.loop
              ? 'border-[var(--color-sea)] bg-[var(--color-sea)]/15 text-[var(--color-sea)]'
              : 'border-[var(--color-border)] text-[var(--color-muted)]',
          )}
        >
          <Repeat className="h-4 w-4" /> Loop
        </button>

        <button
          onClick={p.onRampToggle}
          aria-pressed={p.ramp}
          title="Øk tempo automatisk +4 BPM for hver loop"
          className={cn(
            'flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors',
            p.ramp
              ? 'border-[var(--color-amber)] bg-[var(--color-amber)]/15 text-[var(--color-amber)]'
              : 'border-[var(--color-border)] text-[var(--color-muted)]',
          )}
        >
          <TrendingUp className="h-4 w-4" /> Trapp opp
        </button>

        <div className="flex min-w-[220px] flex-1 items-center gap-3">
          <span className="w-16 shrink-0 text-sm text-[var(--color-muted)]">Tempo</span>
          <input
            type="range"
            min={40}
            max={180}
            step={1}
            value={p.bpm}
            onChange={(e) => p.onBpm(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer accent-[var(--color-amber)]"
            aria-label="Tempo (BPM)"
          />
          <span className="w-20 shrink-0 text-right font-display text-lg tabular-nums">
            {p.bpm}
            <span className="ml-1 text-xs text-[var(--color-muted)]">BPM</span>
          </span>
        </div>
      </div>

      {/* Row 2: hand select */}
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-sm text-[var(--color-muted)]">Hånd</span>
        <div className="flex gap-2">
          {HANDS.map((h) => (
            <button
              key={h.id}
              onClick={() => p.onHand(h.id)}
              aria-pressed={p.hand === h.id}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                p.hand === h.id
                  ? h.id === 'R'
                    ? 'border-[var(--color-amber)] bg-[var(--color-amber)]/15 text-[var(--color-amber)]'
                    : h.id === 'L'
                      ? 'border-[var(--color-sea)] bg-[var(--color-sea)]/15 text-[var(--color-sea)]'
                      : 'border-[var(--color-ivory)] bg-[var(--color-ivory)]/10 text-[var(--color-ivory)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)]',
              )}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 3: key grid */}
      <div className="flex items-start gap-2">
        <span className="mt-1.5 w-16 shrink-0 text-sm text-[var(--color-muted)]">Toneart</span>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
          {KEY_NAMES.map((name, k) => (
            <button
              key={k}
              onClick={() => p.onKey(k)}
              aria-pressed={p.targetKey === k}
              className={cn(
                'rounded-lg border py-1.5 text-sm font-medium tabular-nums transition-colors',
                p.targetKey === k
                  ? 'border-[var(--color-amber)] bg-[var(--color-amber)] text-[#171210]'
                  : 'border-[var(--color-border)] bg-[var(--color-raised)] text-[var(--color-ivory)] hover:border-[var(--color-amber)]/50',
              )}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
