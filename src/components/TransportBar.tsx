'use client'

import { useState } from 'react'
import { ChevronDown, Play, Square, Repeat, Loader2, TrendingUp, Timer, Hash, Waves } from 'lucide-react'
import type { HandFilter } from '@/types/lick'
import { KEY_NAMES } from '@/lib/music'
import { INSTRUMENT_LABEL, INSTRUMENT_ORDER, type InstrumentKind } from '@/lib/instruments'
import { cn } from '@/lib/cn'

interface Props {
  isPlaying: boolean
  isLoading: boolean
  onPlayToggle: () => void
  loop: boolean
  onLoopToggle: () => void
  ramp: boolean
  onRampToggle: () => void
  metronome: boolean
  onMetronomeToggle: () => void
  countIn: boolean
  onCountInToggle: () => void
  swing: number
  onSwingToggle: () => void
  bpm: number
  defaultBpm: number
  onBpm: (bpm: number) => void
  targetKey: number
  onKey: (k: number) => void
  hand: HandFilter
  onHand: (h: HandFilter) => void
  instrument: InstrumentKind
  onInstrument: (k: InstrumentKind) => void
  /** Gitar-variant (D3): rad-etikett «Stemme» + piller Begge/Bass/Melodi. Samme
   * h-id-er ('both'/'L'/'R') — bare etikettene endres. Default (piano) = som før. */
  voiceLabels?: boolean
  /** Vis hånd/stemme-raden. Default true. Bass er enstemmig (alle noter R) →
   * raden er inert og skjules (BD7). */
  showHand?: boolean
}

const HANDS: { id: HandFilter; label: string }[] = [
  { id: 'both', label: 'Begge' },
  { id: 'L', label: 'Venstre' },
  { id: 'R', label: 'Høyre' },
]

// Gitar-semantikk (D3): venstre = bass/tommel, høyre = melodi/plukk.
const VOICES: { id: HandFilter; label: string }[] = [
  { id: 'both', label: 'Begge' },
  { id: 'L', label: 'Bass' },
  { id: 'R', label: 'Melodi' },
]

export function TransportBar(p: Props) {
  // Mobil-komprimering: rad 2–5 skjules bak «Flere kontroller» på små skjermer.
  // Ren CSS-override (sm:flex) — desktop-DOM er identisk med før, null regresjon.
  const [moreOpen, setMoreOpen] = useState(false)
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

      <button
        type="button"
        onClick={() => setMoreOpen((v) => !v)}
        aria-expanded={moreOpen}
        aria-controls="transport-more"
        className="flex items-center justify-center gap-1.5 rounded-full border border-[var(--color-border)] py-2 text-sm font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-ivory)] sm:hidden"
      >
        Flere kontroller
        <ChevronDown className={cn('h-4 w-4 transition-transform', moreOpen && 'rotate-180')} />
      </button>

      <div
        id="transport-more"
        className={cn(moreOpen ? 'flex flex-col gap-4' : 'hidden', 'sm:flex sm:flex-col sm:gap-4')}
      >
      {/* Row 2: rhythm feel (metronome / count-in / swing) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-16 shrink-0 text-sm text-[var(--color-muted)]">Rytme</span>
        <button
          onClick={p.onMetronomeToggle}
          aria-pressed={p.metronome}
          title="Metronom-klikk på hvert slag"
          className={cn(
            'flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors',
            p.metronome
              ? 'border-[var(--color-sea)] bg-[var(--color-sea)]/15 text-[var(--color-sea)]'
              : 'border-[var(--color-border)] text-[var(--color-muted)]',
          )}
        >
          <Timer className="h-4 w-4" /> Metronom
        </button>

        <button
          onClick={p.onCountInToggle}
          aria-pressed={p.countIn}
          title="Tell inn én takt før avspilling"
          className={cn(
            'flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors',
            p.countIn
              ? 'border-[var(--color-sea)] bg-[var(--color-sea)]/15 text-[var(--color-sea)]'
              : 'border-[var(--color-border)] text-[var(--color-muted)]',
          )}
        >
          <Hash className="h-4 w-4" /> Tell inn
        </button>

        <button
          onClick={p.onSwingToggle}
          aria-pressed={p.swing > 0}
          title="Swing-følelse (jazz/blues/gospel)"
          className={cn(
            'flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors',
            p.swing > 0
              ? 'border-[var(--color-amber)] bg-[var(--color-amber)]/15 text-[var(--color-amber)]'
              : 'border-[var(--color-border)] text-[var(--color-muted)]',
          )}
        >
          <Waves className="h-4 w-4" /> Swing
        </button>
      </div>

      {/* Row 3: hand/voice select — skjult for enstemmige instrumenter (bass, BD7) */}
      {p.showHand !== false && (
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-sm text-[var(--color-muted)]">
            {p.voiceLabels ? 'Stemme' : 'Hånd'}
          </span>
          <div className="flex gap-2">
            {(p.voiceLabels ? VOICES : HANDS).map((h) => (
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
      )}

      {/* Row 4: instrument sound (global — engine follows via AppShell/session) */}
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-sm text-[var(--color-muted)]">Lyd</span>
        {/* flex-wrap: fire instrument-piller bryter til ny linje på smale skjermer
            (uten wrap flyter de utenfor og gir horisontal scroll — G1). */}
        <div className="flex flex-wrap gap-2">
          {INSTRUMENT_ORDER.map((k) => (
            <button
              key={k}
              onClick={() => p.onInstrument(k)}
              aria-pressed={p.instrument === k}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                p.instrument === k
                  ? 'border-[var(--color-amber)] bg-[var(--color-amber)]/15 text-[var(--color-amber)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)]',
              )}
            >
              {INSTRUMENT_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {/* Row 5: key grid */}
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
    </div>
  )
}
