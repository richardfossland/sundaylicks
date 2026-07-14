'use client'

// One full-height reel card. Presentational: it owns no Tone/engine state — the
// active card's playback is driven by BlaView's useReelPlayer, and only the
// small <LiveRoll> child (mounted solely on the ACTIVE card) subscribes to the
// 60fps playhead so non-active near-cards never re-render on every frame.
//
// Virtualization contract: heavy content (transposed notes + PianoRoll +
// VexFlow) is mounted ONLY when `near` (|i − activeIndex| ≤ 1). Every other
// section renders a light, same-height placeholder so the scroll-snap geometry
// (én full-height seksjon per lick) is identical whether or not the card is realised.

import { useMemo } from 'react'
import Link from 'next/link'
import { Check, RotateCcw, Volume2, VolumeX, Loader2, Guitar } from 'lucide-react'
import type { Lick } from '@/types/lick'
import { transposedNotes } from '@/lib/transpose'
import { KEY_NAMES } from '@/lib/music'
import { CATEGORY_LABEL, GENRE_LABEL } from '@/lib/labels'
import { usePlayer } from '@/lib/store'
import { PianoRoll } from '@/components/PianoRoll'
import { Notation } from '@/components/NotationLazy'
import { FavoriteButton } from '@/components/FavoriteButton'
import { DifficultyBadge } from '@/components/DifficultyBadge'
import { cn } from '@/lib/cn'

interface Props {
  lick: Lick
  index: number
  total: number
  active: boolean
  /** Realise heavy content only for the active card and its immediate neighbours. */
  near: boolean
  practiced: boolean
  /** Pitch class 0–11 to display/play the lick in (the session key). */
  targetKey: number
  /** Audio unlocked yet? Drives the "tap to start sound" prompt on the active card. */
  soundReady: boolean
  autoplay: boolean
  isLoading: boolean
  onReplay: () => void
  onToggleAutoplay: () => void
}

/** The only subscriber to the live playhead — mounted just for the active card. */
function LiveRoll({ notes, beats }: { notes: Lick['notes']; beats: number }) {
  const currentBeat = usePlayer((s) => s.currentBeat)
  return <PianoRoll notes={notes} hand="both" beats={beats} currentBeat={currentBeat} />
}

export function ReelCard({
  lick,
  index,
  total,
  active,
  near,
  practiced,
  targetKey,
  soundReady,
  autoplay,
  isLoading,
  onReplay,
  onToggleAutoplay,
}: Props) {
  const notes = useMemo(() => (near ? transposedNotes(lick, targetKey) : []), [near, lick, targetKey])

  // ?key= only when actually transposed away from the lick's own key (LickCard idiom).
  const transposed = targetKey !== lick.original_key
  const href = transposed ? `/lick/${lick.slug}?key=${KEY_NAMES[targetKey]}` : `/lick/${lick.slug}`

  // Light placeholder: same fixed height, name only — keeps snap geometry intact.
  if (!near) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-2xl text-[var(--color-muted)]/70">{lick.name}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-3 px-4 pb-[env(safe-area-inset-bottom)] pt-4 sm:px-6">
      {/* ── Top: counter · name · meta ── */}
      <div className="shrink-0">
        <p className="text-xs font-medium tracking-wide text-[var(--color-muted)]">
          {index + 1} av {total}
        </p>
        <h2 className="mt-1 flex items-center gap-2 font-display text-2xl leading-tight text-[var(--color-ivory)] sm:text-3xl">
          {practiced && (
            <span
              title="Øvd"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--color-sea)]/20 text-[var(--color-sea)]"
            >
              <Check className="h-4 w-4" />
            </span>
          )}
          {lick.name}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-[var(--color-muted)]">
          <span className="rounded-full border border-[var(--color-amber)]/40 bg-[var(--color-amber)]/10 px-2.5 py-0.5 text-xs text-[var(--color-amber)]">
            {GENRE_LABEL[lick.genre]}
          </span>
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] px-2.5 py-0.5 text-xs text-[var(--color-muted)]">
            {CATEGORY_LABEL[lick.category]}
          </span>
          {lick.instrument === 'gitar' && (
            <span className="flex items-center gap-1 rounded-full border border-[var(--color-amber)]/50 bg-[var(--color-raised)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-amber)] shadow-sm">
              <Guitar className="h-3 w-3" /> Gitar
            </span>
          )}
          <DifficultyBadge difficulty={lick.difficulty} />
          <span>
            {KEY_NAMES[targetKey]}-dur · {lick.default_bpm} BPM · {lick.beats} slag
          </span>
        </div>
        {lick.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--color-muted)]">{lick.description}</p>
        )}
      </div>

      {/* ── Middle: piano-roll hero (live playhead on the active card) + notation ── */}
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3">
        <div className="max-h-[240px] overflow-y-auto">
          {active ? (
            <LiveRoll notes={notes} beats={lick.beats} />
          ) : (
            <PianoRoll notes={notes} hand="both" beats={lick.beats} currentBeat={0} />
          )}
        </div>
        {/* VexFlow is dropped entirely on short phones (375×667) to save vertical room. */}
        <div className="hidden [@media(min-height:700px)]:block">
          <Notation notes={notes} beats={lick.beats} timeSignature={lick.time_signature} />
        </div>
        {active && !soundReady && (
          <p className="text-center text-xs text-[var(--color-muted)]">Trykk hvor som helst for å starte lyden</p>
        )}
      </div>

      {/* ── Bottom bar: primary CTA + controls ── */}
      <div className="flex shrink-0 items-center gap-2 pb-3">
        <Link
          href={href}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--color-amber)] px-4 py-3 text-sm font-semibold text-[var(--color-ink-on-amber)] transition-opacity hover:opacity-90"
        >
          Øv på denne
        </Link>
        <FavoriteButton
          slug={lick.slug}
          size={20}
          className="border border-[var(--color-border)] bg-[var(--color-raised)]"
        />
        <button
          type="button"
          onClick={onReplay}
          aria-label="Spill av på nytt"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] text-[var(--color-muted)] transition-colors hover:text-[var(--color-ivory)]"
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RotateCcw className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={onToggleAutoplay}
          aria-pressed={autoplay}
          aria-label={autoplay ? 'Slå av autospill' : 'Slå på autospill'}
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors',
            autoplay
              ? 'border-[var(--color-amber)]/50 bg-[var(--color-amber)]/10 text-[var(--color-amber)]'
              : 'border-[var(--color-border)] bg-[var(--color-raised)] text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
          )}
        >
          {autoplay ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
      </div>
    </div>
  )
}
