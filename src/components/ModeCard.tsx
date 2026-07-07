import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { ACCENT_CLASSES, type ModeDef } from '@/lib/modes'
import { cn } from '@/lib/cn'

/**
 * One big, tactile entry point into a mode — the launcher's whole reason to
 * exist. Large touch target, per-mode accent, verb-first label + one-line
 * tagline. See `@/lib/modes` for the data and `AppShell` for the contract
 * the destination route (`/${mode.slug}`) is expected to follow.
 */
export function ModeCard({ mode }: { mode: ModeDef }) {
  const Icon = mode.icon
  const accent = ACCENT_CLASSES[mode.accent]

  return (
    <Link
      href={`/${mode.slug}`}
      className={cn(
        'group flex min-h-[13rem] flex-col gap-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-lg shadow-black/10 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20 sm:p-7',
        accent.hoverBorder,
      )}
    >
      <span className={cn('grid h-14 w-14 shrink-0 place-items-center rounded-2xl', accent.softBg, accent.softText)}>
        <Icon className="h-7 w-7" strokeWidth={1.75} />
      </span>

      <div>
        <h2 className="font-display text-2xl leading-tight text-[var(--color-ivory)] sm:text-[1.75rem]">
          {mode.label}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{mode.tagline}</p>
      </div>

      <span
        className={cn(
          'mt-auto flex items-center gap-1 text-sm font-medium opacity-90 transition-opacity group-hover:opacity-100',
          accent.softText,
        )}
      >
        Åpne <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}
