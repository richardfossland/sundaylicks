'use client'

// Den ENESTE Tone-nære oppslagsverk-komponenten. Lastes `dynamic({ ssr:false })`
// fra GlossaryBrowser, så all avspilling (useDemoPlayer → playback.ts → Tone)
// holdes utenfor server-render og cf:build-grafen.
//
// Fire visninger, én per demo-form:
//   • KeyboardDemo    — MiniKeyboard (trykkbar) + «Hør det».
//   • ProgressionDemo — ChordStrip + MiniKeyboard som følger aktiv akkord.
//   • AbDemo          — delt visning + segmenterte variant-piller (trykk = velg +
//                       spill); pilleikonet viser status for aktiv variant.
//   • CircleDemo      — kvintsirkel (klikk toneart → hør tonika-treklang).

import { useState } from 'react'
import { Loader2, Play, Square } from 'lucide-react'
import type { GlossaryDemo, DemoChord, DemoPhrase } from '@/data/glossary-demos'
import type { Key } from '@/lib/theory/keys'
import { chordPitchClasses } from '@/lib/music'
import { nearestOffset } from '@/lib/transpose'
import { usePlayer } from '@/lib/store'
import { cn } from '@/lib/cn'
import { MiniKeyboard } from './MiniKeyboard'
import { ChordStrip } from '@/components/ChordStrip'
import { CircleOfFifths } from '@/components/CircleOfFifths'
import { useDemoPlayer, type DemoPlayer } from './useDemoPlayer'

const EPS = 1e-6

export default function DemoBlock({ demo }: { demo: GlossaryDemo }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-raised)] p-4">
      {demo.kind === 'keyboard' && <KeyboardDemo demo={demo} />}
      {demo.kind === 'progression' && <ProgressionDemo demo={demo} />}
      {demo.kind === 'ab' && <AbDemo demo={demo} />}
      {demo.kind === 'circle' && <CircleDemo demo={demo} />}
      <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">{demo.caption}</p>
    </div>
  )
}

// ── «Hør det»-knapp ──────────────────────────────────────────────────────────

function HearButton({
  playing,
  loading,
  onPlay,
  onStop,
}: {
  playing: boolean
  loading: boolean
  onPlay: () => void
  onStop: () => void
}) {
  return (
    <button
      type="button"
      onClick={playing ? onStop : onPlay}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
        playing
          ? 'bg-[var(--color-sea)] text-[var(--color-ink-on-sea)]'
          : 'bg-[var(--color-amber)] text-[var(--color-ink-on-amber)] hover:brightness-110',
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : playing ? (
        <Square className="h-4 w-4" />
      ) : (
        <Play className="h-4 w-4" />
      )}
      {playing ? 'Stopp' : 'Hør det'}
    </button>
  )
}

// ── Keyboard ─────────────────────────────────────────────────────────────────

function KeyboardDemo({ demo }: { demo: Extract<GlossaryDemo, { kind: 'keyboard' }> }) {
  const player = useDemoPlayer()
  const playing = player.playingKey === 'chord'
  return (
    <div className="flex flex-col gap-3">
      <MiniKeyboard
        pitches={demo.chord.pitches}
        root={demo.chord.root}
        labels={demo.chord.labels}
        onKeyPress={player.playKey}
      />
      <HearButton
        playing={playing}
        loading={playing && player.isLoading}
        onPlay={() => player.playChord('chord', demo.chord)}
        onStop={player.stop}
      />
    </div>
  )
}

// ── Progression ──────────────────────────────────────────────────────────────

/** Toner som lyder ved `beat` (−1 = ingen). */
function soundingAt(phrase: DemoPhrase, beat: number): Set<number> {
  return new Set(phrase.notes.filter((n) => n.t - EPS <= beat && beat < n.t + n.d - EPS).map((n) => n.p))
}

function PhraseView({ phrase, playing, player, playKey }: { phrase: DemoPhrase; playing: boolean; player: DemoPlayer; playKey: string }) {
  const currentBeat = usePlayer((s) => s.currentBeat)
  const isThis = player.playingKey === playKey
  const beat = playing && isThis ? currentBeat : -1
  const chords = phrase.chords ?? []
  const allPitches = [...new Set(phrase.notes.map((n) => n.p))]
  const active = beat >= 0 ? soundingAt(phrase, beat) : undefined
  const activeChord = chords.find((c) => c.t - EPS <= beat && beat < c.t + c.d - EPS) ?? chords[0]
  return (
    <div className="flex flex-col gap-2">
      {chords.length > 0 && <ChordStrip chords={chords} beats={phrase.beats} currentBeat={beat} />}
      <MiniKeyboard pitches={allPitches} active={active} root={activeChord?.r} />
    </div>
  )
}

function ProgressionDemo({ demo }: { demo: Extract<GlossaryDemo, { kind: 'progression' }> }) {
  const player = useDemoPlayer()
  const playing = player.playingKey === 'phrase'
  return (
    <div className="flex flex-col gap-3">
      <PhraseView phrase={demo.phrase} playing={playing} player={player} playKey="phrase" />
      <HearButton
        playing={playing}
        loading={playing && player.isLoading}
        onPlay={() => player.playPhrase('phrase', demo.phrase)}
        onStop={player.stop}
      />
    </div>
  )
}

// ── A/B ──────────────────────────────────────────────────────────────────────

function AbDemo({ demo }: { demo: Extract<GlossaryDemo, { kind: 'ab' }> }) {
  const player = useDemoPlayer()
  const [sel, setSel] = useState(0)
  const variant = demo.variants[sel]
  const key = `v${sel}`
  const playing = player.playingKey === key

  function press(i: number) {
    setSel(i)
    const v = demo.variants[i]
    if (v.chord) player.playChord(`v${i}`, v.chord)
    else if (v.phrase) player.playPhrase(`v${i}`, v.phrase)
  }

  return (
    <div className="flex flex-col gap-3">
      {variant.chord ? (
        <MiniKeyboard
          pitches={variant.chord.pitches}
          root={variant.chord.root}
          labels={variant.chord.labels}
          onKeyPress={player.playKey}
        />
      ) : variant.phrase ? (
        <PhraseView phrase={variant.phrase} playing={playing} player={player} playKey={key} />
      ) : null}

      <div
        role="group"
        aria-label="Velg variant"
        className="scroll-x flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
      >
        {demo.variants.map((v, i) => {
          const isSel = sel === i
          const isPlaying = player.playingKey === `v${i}`
          return (
            <button
              key={i}
              type="button"
              aria-pressed={isSel}
              onClick={() => press(i)}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                isSel
                  ? 'bg-[var(--color-amber)] text-[var(--color-ink-on-amber)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
              )}
            >
              {isPlaying && player.isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isPlaying ? (
                <Square className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5 opacity-70" />
              )}
              {v.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Kvintsirkel ──────────────────────────────────────────────────────────────

function CircleDemo({ demo }: { demo: Extract<GlossaryDemo, { kind: 'circle' }> }) {
  const player = useDemoPlayer()
  const [sel, setSel] = useState<Key>({ root: 0, mode: 'major' })

  function pick(k: Key) {
    setSel(k)
    // Tonika-treklang lagt nær C4 (grunntone + ters + kvint i næreste register).
    const pcs = chordPitchClasses(k.root, k.mode === 'minor' ? 'm' : '')
    const pitches = pcs.map((pc) => 60 + nearestOffset(0, pc))
    player.playChord('circle', { pitches, root: k.root })
  }

  return (
    <CircleOfFifths
      from={sel}
      to={sel}
      showTarget={false}
      onSelectFrom={pick}
      onSelectTo={() => {}}
    />
  )
}
