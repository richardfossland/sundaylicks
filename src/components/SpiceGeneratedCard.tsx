'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Heart, ListPlus, Check, Plus } from 'lucide-react'
import type { Lick } from '@/types/lick'
import { useCollections } from '@/lib/collections'
import { cn } from '@/lib/cn'
import { DifficultyBadge } from './DifficultyBadge'

/**
 * A generated (in-memory, not-yet-in-the-DB) lick — reharm/voicing/progression
 * suggestions from the /spice flow. Looks like `LickCard` but plays inline
 * (via the shared preview panel, `onPlay`) instead of navigating to a route
 * that doesn't exist for synthetic content, and saves via the `*Lick`
 * collections API (keyed by `lick.id`, not slug).
 */
export function SpiceGeneratedCard({
  lick,
  badge,
  active,
  onPlay,
}: {
  lick: Lick
  badge?: string
  active?: boolean
  onPlay: () => void
}) {
  const isFav = useCollections((s) => s.isFavoriteLick(lick.id))
  const toggleFav = useCollections((s) => s.toggleFavoriteLick)
  const lists = useCollections((s) => s.lists)
  const toggleInList = useCollections((s) => s.toggleLickInList)
  const createList = useCollections((s) => s.createList)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-2xl border p-4 transition-colors',
        active
          ? 'border-[var(--color-amber)] bg-[var(--color-amber)]/10'
          : 'border-[var(--color-border)] bg-[var(--color-surface)]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {badge && (
            <span className="mb-1 inline-block rounded-full border border-[var(--color-sea)]/40 bg-[var(--color-sea)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-sea)]">
              {badge}
            </span>
          )}
          <h4 className="truncate font-display text-base leading-tight text-[var(--color-ivory)]">{lick.name}</h4>
        </div>
        <button
          type="button"
          aria-pressed={isFav}
          aria-label={isFav ? 'Fjern favoritt' : 'Legg til favoritt'}
          onClick={() => toggleFav(lick)}
          className={cn(
            'grid shrink-0 place-items-center rounded-full p-1.5 transition-colors',
            isFav ? 'text-[var(--color-amber)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
          )}
        >
          <Heart className="h-4 w-4" fill={isFav ? 'currentColor' : 'none'} />
        </button>
      </div>

      {lick.description && <p className="line-clamp-2 text-xs leading-relaxed text-[var(--color-muted)]">{lick.description}</p>}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
        <DifficultyBadge difficulty={lick.difficulty} />
        <span>{lick.default_bpm} BPM</span>
      </div>

      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={onPlay}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
            active
              ? 'bg-[var(--color-amber)] text-[var(--color-ink-on-amber)]'
              : 'border border-[var(--color-border)] text-[var(--color-ivory)] hover:border-[var(--color-amber)]/60',
          )}
        >
          <Play className="h-3.5 w-3.5" fill="currentColor" /> {active ? 'Spiller' : 'Spill'}
        </button>

        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-ivory)]"
          >
            <ListPlus className="h-3.5 w-3.5" /> Liste
          </button>
          {open && (
            <div className="absolute left-0 z-20 mt-2 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-raised)] p-2 shadow-xl">
              <p className="px-2 py-1 text-xs text-[var(--color-muted)]">Legg til i liste</p>
              {lists.length === 0 && <p className="px-2 py-1.5 text-sm text-[var(--color-muted)]">Ingen lister enda.</p>}
              <div className="max-h-52 overflow-y-auto">
                {lists.map((l) => {
                  const inList = l.items.some((r) => r.kind === 'lick' && r.lick.id === lick.id)
                  return (
                    <button
                      key={l.id}
                      onClick={() => toggleInList(l.id, lick)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-[var(--color-ivory)] hover:bg-[var(--color-surface)]"
                    >
                      <span className="truncate">{l.name}</span>
                      <span
                        className={cn(
                          'grid h-4 w-4 shrink-0 place-items-center rounded border',
                          inList
                            ? 'border-[var(--color-amber)] bg-[var(--color-amber)] text-[var(--color-ink-on-amber)]'
                            : 'border-[var(--color-border)]',
                        )}
                      >
                        {inList && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  )
                })}
              </div>
              <NewListRow onCreate={(name) => toggleInList(createList(name), lick)} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NewListRow({ onCreate }: { onCreate: (name: string) => void }) {
  const [name, setName] = useState('')
  const create = () => {
    if (!name.trim()) return
    onCreate(name)
    setName('')
  }
  return (
    <div className="mt-1 flex items-center gap-1 border-t border-[var(--color-border)] pt-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && create()}
        placeholder="Ny liste"
        className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-ivory)] outline-none focus:border-[var(--color-amber)]"
      />
      <button
        onClick={create}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--color-amber)] text-[var(--color-ink-on-amber)]"
        aria-label="Lag liste"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
