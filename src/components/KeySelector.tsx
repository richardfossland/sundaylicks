'use client'

import { useEffect } from 'react'
import { NOTE_NAMES } from '@/lib/music'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/cn'

/**
 * Global "din toneart" picker — 12 root buttons + a dur/moll toggle, backed by
 * `useSession`. Mount it anywhere; state is shared app-wide. `compact` trims
 * padding for the header; the default (larger) size suits the dashboard hero.
 */
export function KeySelector({ compact, className }: { compact?: boolean; className?: string }) {
  const key = useSession((s) => s.key)
  const setKey = useSession((s) => s.setKey)
  const load = useSession((s) => s.load)

  // Hydrate from localStorage on first mount wherever the selector appears.
  useEffect(() => {
    load()
  }, [load])

  return (
    <div
      role="group"
      aria-label="Din toneart"
      className={cn('flex min-w-0 items-center gap-1.5 sm:gap-2', className)}
    >
      <div
        className={cn(
          'scroll-x flex min-w-0 items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-raised)]',
          compact ? 'p-0.5' : 'p-1',
        )}
      >
        {NOTE_NAMES.map((name, i) => (
          <button
            key={name}
            type="button"
            aria-pressed={key.root === i}
            aria-label={`Toneart ${name}`}
            onClick={() => setKey({ root: i })}
            className={cn(
              'shrink-0 rounded-full text-center font-medium tabular-nums transition-colors',
              compact ? 'min-w-[1.75rem] px-2 py-1 text-xs' : 'min-w-[2.25rem] px-2.5 py-1.5 text-sm',
              key.root === i
                ? 'bg-[var(--color-amber)] text-[var(--color-ink-on-amber)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
            )}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="flex shrink-0 items-center overflow-hidden rounded-full border border-[var(--color-border)]">
        {(['major', 'minor'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={key.mode === m}
            onClick={() => setKey({ mode: m })}
            className={cn(
              'font-medium transition-colors',
              compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              key.mode === m
                ? 'bg-[var(--color-sea)] text-[var(--color-ink-on-sea)]'
                : 'bg-[var(--color-raised)] text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
            )}
          >
            {m === 'major' ? 'Dur' : 'Moll'}
          </button>
        ))}
      </div>
    </div>
  )
}
