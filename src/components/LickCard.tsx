import Link from 'next/link'
import { Check, ArrowLeftRight } from 'lucide-react'
import type { Lick } from '@/types/lick'
import { CATEGORY_LABEL, GENRE_LABEL, DIFFICULTY_LABEL, difficultyDots } from '@/lib/labels'
import { KEY_NAMES } from '@/lib/music'
import { FavoriteButton } from './FavoriteButton'

export function LickCard({
  lick,
  practiced,
  bestBpm,
  targetKey,
}: {
  lick: Lick
  practiced?: boolean
  bestBpm?: number
  /**
   * Pitch class (0–11) to display/open the lick in, e.g. the dashboard's
   * currently selected "toneart". Defaults to the lick's own key. The lick
   * page reads the same `?key=` share param already used for transposed
   * links (see lib/share.ts), so opening from here lands already transposed.
   */
  targetKey?: number
}) {
  const displayKey = targetKey ?? lick.original_key
  const transposed = targetKey !== undefined && targetKey !== lick.original_key
  const href = transposed ? `/lick/${lick.slug}?key=${KEY_NAMES[targetKey]}` : `/lick/${lick.slug}`

  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-amber)]/60"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-xl leading-tight text-[var(--color-ivory)]">
          {practiced && (
            <span title="Øvd" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-sea)]/20 text-[var(--color-sea)]">
              <Check className="h-3.5 w-3.5" />
            </span>
          )}
          {lick.name}
        </h3>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <FavoriteButton slug={lick.slug} stopNav className="-mr-1 -mt-1" />
          <span className="rounded-full border border-[var(--color-amber)]/40 bg-[var(--color-amber)]/10 px-2.5 py-0.5 text-xs text-[var(--color-amber)]">
            {GENRE_LABEL[lick.genre]}
          </span>
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] px-2.5 py-0.5 text-xs text-[var(--color-muted)]">
            {CATEGORY_LABEL[lick.category]}
          </span>
        </div>
      </div>

      {lick.description && (
        <p className="line-clamp-2 text-sm leading-relaxed text-[var(--color-muted)]">
          {lick.description}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--color-muted)]">
        <span className="tracking-widest text-[var(--color-amber)]" title={DIFFICULTY_LABEL[lick.difficulty]}>
          {difficultyDots(lick.difficulty)}
        </span>
        <span className="inline-flex items-center gap-1">
          {transposed && (
            <ArrowLeftRight
              className="h-3 w-3 text-[var(--color-sea)]"
              aria-hidden
            />
          )}
          <span title={transposed ? `Transponert fra ${KEY_NAMES[lick.original_key]}-dur` : undefined}>
            {KEY_NAMES[displayKey]}-dur
          </span>
        </span>
        <span>{lick.default_bpm} BPM</span>
        {bestBpm ? <span className="text-[var(--color-sea)]">beste {bestBpm}</span> : null}
      </div>
    </Link>
  )
}
