'use client'

// De to Tone-nære onboarding-stegene. Lastes `dynamic({ ssr:false })` fra
// Onboarding, så all avspilling (useDemoPlayer → playback.ts → Tone) holdes
// utenfor server-render og cf:build-grafen — samme isolasjon som DemoBlock i
// oppslagsverket.
//
//   • kind="lick" → WelcomeLickDemo: stor play-knapp + MiniKeyboard som følger
//     slaget mens velkomst-frasen spilles. Første tap låser opp Web Audio (iOS).
//   • kind="wait" → WaitModeDemo: ekte vent-modus — én tangent lyser om gangen,
//     riktig tapp spiller tonen og går videre, feil tapp gjør ingenting. Tre
//     riktige → ferdig.

import { useState } from 'react'
import { Check, Loader2, Play } from 'lucide-react'
import { MiniKeyboard } from '@/components/glossary/MiniKeyboard'
import { useDemoPlayer } from '@/components/glossary/useDemoPlayer'
import { usePlayer } from '@/lib/store'
import type { DemoPhrase } from '@/data/glossary-demos'
import { WELCOME_PHRASE, WAIT_DEMO_PITCHES } from './onboarding-demos'
import { cn } from '@/lib/cn'

const EPS = 1e-6

export default function OnboardingSteps({ kind }: { kind: 'lick' | 'wait' }) {
  return kind === 'lick' ? <WelcomeLickDemo /> : <WaitModeDemo />
}

// ── Steg 2: hør en lick ────────────────────────────────────────────────────────

/** Tonene som lyder ved `beat` (−1 = ingen). */
function soundingAt(phrase: DemoPhrase, beat: number): Set<number> {
  return new Set(phrase.notes.filter((n) => n.t - EPS <= beat && beat < n.t + n.d - EPS).map((n) => n.p))
}

function WelcomeLickDemo() {
  const player = useDemoPlayer()
  const currentBeat = usePlayer((s) => s.currentBeat)
  const playing = player.playingKey === 'welcome'

  const allPitches = [...new Set(WELCOME_PHRASE.notes.map((n) => n.p))]
  const active = playing && currentBeat >= 0 ? soundingAt(WELCOME_PHRASE, currentBeat) : undefined

  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <MiniKeyboard pitches={allPitches} active={active} root={0} onKeyPress={player.playKey} />
      <button
        type="button"
        onClick={playing ? player.stop : () => player.playPhrase('welcome', WELCOME_PHRASE)}
        className={cn(
          'flex items-center gap-2.5 rounded-full px-7 py-3.5 text-base font-semibold transition-transform hover:scale-[1.02]',
          'bg-[var(--color-amber)] text-[var(--color-ink-on-amber)]',
        )}
      >
        {player.isLoading && playing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Play className="h-5 w-5" />
        )}
        {playing ? 'Spiller…' : 'Spill licken'}
      </button>
      <p className="text-center text-xs text-[var(--color-muted)]">
        Tips: tapp enkelttangenter for å høre hver tone for seg.
      </p>
    </div>
  )
}

// ── Steg 4: ekte vent-modus-demo ───────────────────────────────────────────────

function WaitModeDemo() {
  const player = useDemoPlayer()
  const [idx, setIdx] = useState(0)
  const done = idx >= WAIT_DEMO_PITCHES.length
  const current = done ? null : WAIT_DEMO_PITCHES[idx]

  function onKeyPress(midi: number) {
    if (done) return
    if (midi === current) {
      player.playKey(midi)
      setIdx((i) => i + 1)
    }
    // Feil tapp: ingenting skjer — akkurat som i ekte vent-modus.
  }

  function skipDemo() {
    setIdx(WAIT_DEMO_PITCHES.length)
  }

  const active = done ? new Set(WAIT_DEMO_PITCHES) : new Set(current != null ? [current] : [])

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <MiniKeyboard pitches={WAIT_DEMO_PITCHES} active={active} root={0} onKeyPress={onKeyPress} />

      {done ? (
        <p className="flex items-center gap-2 text-center text-sm font-medium text-[var(--color-amber)]">
          <Check className="h-4 w-4" /> Akkurat sånn øver du inn licks.
        </p>
      ) : (
        <>
          <p className="text-center text-sm text-[var(--color-muted)]">
            Tapp tangenten som lyser — {WAIT_DEMO_PITCHES.length - idx} igjen.
          </p>
          <button
            type="button"
            onClick={skipDemo}
            className="text-xs font-medium text-[var(--color-muted)] underline underline-offset-2 transition-colors hover:text-[var(--color-ivory)]"
          >
            Hopp over demoen
          </button>
        </>
      )}
    </div>
  )
}
