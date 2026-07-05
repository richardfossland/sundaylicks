import Link from 'next/link'
import type { Lick } from '@/types/lick'
import { CATEGORY_LABEL, DIFFICULTY_LABEL, difficultyDots } from '@/lib/labels'
import { KEY_NAMES } from '@/lib/music'

export function LickCard({ lick }: { lick: Lick }) {
  return (
    <Link
      href={`/lick/${lick.slug}`}
      className="group flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-amber)]/60"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-xl leading-tight text-[var(--color-ivory)]">{lick.name}</h3>
        <span className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] px-2.5 py-0.5 text-xs text-[var(--color-muted)]">
          {CATEGORY_LABEL[lick.category]}
        </span>
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
        <span>{KEY_NAMES[lick.original_key]}-dur</span>
        <span>{lick.default_bpm} BPM</span>
      </div>
    </Link>
  )
}
