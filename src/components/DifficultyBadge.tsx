import type { Difficulty } from '@/types/lick'
import { DIFFICULTY_LABEL, difficultyDots } from '@/lib/labels'
import { cn } from '@/lib/cn'

/**
 * Difficulty as amber dots PLUS a visible word ("Nybegynner"/"Middels"/
 * "Avansert") — the dots alone read as decoration, so the label spells out
 * what they mean. Non-interactive plain spans (safe inside a <Link>, e.g.
 * LickCard); keeps a small visual weight so it never competes with the title.
 */
export function DifficultyBadge({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      aria-label={`Nivå: ${DIFFICULTY_LABEL[difficulty]}`}
    >
      <span aria-hidden className="tracking-widest text-[var(--color-amber)]">
        {difficultyDots(difficulty)}
      </span>
      <span className="text-xs text-[var(--color-muted)]">{DIFFICULTY_LABEL[difficulty]}</span>
    </span>
  )
}
