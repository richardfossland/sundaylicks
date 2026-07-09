'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Heart, ListPlus, Play, Plus } from 'lucide-react'
import type { TransitionResult } from '@/lib/theory/transitions'
import type { Lick } from '@/types/lick'
import { chordLabel } from '@/lib/music'
import { DIFFICULTY_LABEL, difficultyDots } from '@/lib/labels'
import { useCollections } from '@/lib/collections'
import { cn } from '@/lib/cn'
import { Notation } from '@/components/NotationLazy'
import { ExportButton } from '@/components/ExportButton'
import { generatedToLick } from './adapter'

/** One ranked transition variant — chord path, mini-notation, play/save actions. */
export function ResultCard({ result, onPlay }: { result: TransitionResult; onPlay: (lick: Lick) => void }) {
  const lick = generatedToLick(result.lick)
  const chordPath = result.lick.chords.map((c) => chordLabel(c.r, c.q)).join(' → ')

  const isFav = useCollections((s) => s.isFavoriteLick(lick.id))
  const toggleFav = useCollections((s) => s.toggleFavoriteLick)
  const lists = useCollections((s) => s.lists)
  const toggleInList = useCollections((s) => s.toggleLickInList)
  const createList = useCollections((s) => s.createList)

  const [listOpen, setListOpen] = useState(false)
  const [newListName, setNewListName] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!listOpen) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setListOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [listOpen])

  const addToNewList = () => {
    if (!newListName.trim()) return
    const id = createList(newListName)
    toggleInList(id, lick)
    setNewListName('')
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="tracking-widest text-[var(--color-amber)]" title={DIFFICULTY_LABEL[result.lick.difficulty]}>
            {difficultyDots(result.lick.difficulty)}
          </p>
          <h3 className="font-display text-lg leading-tight text-[var(--color-ivory)]">{result.label}</h3>
          <p className="text-sm text-[var(--color-muted)]">{chordPath}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-pressed={isFav}
            aria-label={isFav ? 'Fjern favoritt' : 'Legg til favoritt'}
            onClick={() => toggleFav(lick)}
            className={cn(
              'grid h-9 w-9 place-items-center rounded-full transition-colors',
              isFav ? 'text-[var(--color-amber)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
            )}
          >
            <Heart className="h-[18px] w-[18px]" fill={isFav ? 'currentColor' : 'none'} />
          </button>

          <div className="relative" ref={ref}>
            <button
              type="button"
              onClick={() => setListOpen((v) => !v)}
              aria-label="Legg i liste"
              className="grid h-9 w-9 place-items-center rounded-full text-[var(--color-muted)] transition-colors hover:text-[var(--color-ivory)]"
            >
              <ListPlus className="h-[18px] w-[18px]" />
            </button>
            {listOpen && (
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-raised)] p-2 shadow-xl">
                <p className="px-2 py-1 text-xs text-[var(--color-muted)]">Legg til i liste</p>
                {lists.length === 0 && <p className="px-2 py-1.5 text-sm text-[var(--color-muted)]">Ingen lister enda.</p>}
                <div className="max-h-52 overflow-y-auto">
                  {lists.map((l) => {
                    const inList = l.items.some((it) => it.kind === 'lick' && it.lick.id === lick.id)
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
                            inList ? 'border-[var(--color-amber)] bg-[var(--color-amber)] text-[#171210]' : 'border-[var(--color-border)]',
                          )}
                        >
                          {inList && <Check className="h-3 w-3" />}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-1 flex items-center gap-1 border-t border-[var(--color-border)] pt-2">
                  <input
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addToNewList()}
                    placeholder="Ny liste"
                    className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-ivory)] outline-none focus:border-[var(--color-amber)]"
                  />
                  <button
                    onClick={addToNewList}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--color-amber)] text-[#171210]"
                    aria-label="Lag liste"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <ExportButton lick={lick} targetKey={lick.original_key} bpm={lick.default_bpm} />
        </div>
      </div>

      <Notation notes={result.lick.notes} beats={result.lick.beats} timeSignature={result.lick.time_signature} />

      <button
        type="button"
        onClick={() => onPlay(lick)}
        className="flex w-fit items-center gap-2 rounded-full bg-[var(--color-amber)] px-4 py-2 text-sm font-medium text-[var(--color-ink-on-amber)] transition-opacity hover:opacity-90"
      >
        <Play className="h-4 w-4" fill="currentColor" /> Øv på denne
      </button>
    </div>
  )
}
