'use client'

import { useEffect, useRef, useState } from 'react'
import { ListPlus, Check, Plus } from 'lucide-react'
import { useCollections } from '@/lib/collections'
import { cn } from '@/lib/cn'

export function AddToListButton({ slug }: { slug: string }) {
  const lists = useCollections((s) => s.lists)
  const toggleInList = useCollections((s) => s.toggleInList)
  const createList = useCollections((s) => s.createList)
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const create = () => {
    if (!newName.trim()) return
    const id = createList(newName)
    toggleInList(id, slug)
    setNewName('')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-ivory)]"
      >
        <ListPlus className="h-4 w-4" /> Liste
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-raised)] p-2 shadow-xl">
          <p className="px-2 py-1 text-xs text-[var(--color-muted)]">Legg til i liste</p>
          {lists.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-[var(--color-muted)]">Ingen lister enda.</p>
          )}
          <div className="max-h-52 overflow-y-auto">
            {lists.map((l) => {
              const inList = l.slugs.includes(slug)
              return (
                <button
                  key={l.id}
                  onClick={() => toggleInList(l.id, slug)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-[var(--color-ivory)] hover:bg-[var(--color-surface)]"
                >
                  <span className="truncate">{l.name}</span>
                  <span
                    className={cn(
                      'grid h-4 w-4 shrink-0 place-items-center rounded border',
                      inList
                        ? 'border-[var(--color-amber)] bg-[var(--color-amber)] text-[#171210]'
                        : 'border-[var(--color-border)]',
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
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder="Ny liste"
              className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-ivory)] outline-none focus:border-[var(--color-amber)]"
            />
            <button
              onClick={create}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--color-amber)] text-[#171210]"
              aria-label="Lag liste"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
