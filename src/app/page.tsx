'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { Lick, Category, Difficulty } from '@/types/lick'
import { FALLBACK_LICKS, fetchLicks } from '@/lib/licks'
import { getProgress, type Progress } from '@/lib/progress'
import { LickCard } from '@/components/LickCard'
import { CATEGORY_LABEL, CATEGORY_ORDER, DIFFICULTY_LABEL } from '@/lib/labels'
import { cn } from '@/lib/cn'

type CatFilter = Category | 'all'
type DiffFilter = Difficulty | 'all'

export default function LibraryPage() {
  // Start with the bundled licks for instant paint; refresh from Supabase.
  const [licks, setLicks] = useState<Lick[]>(FALLBACK_LICKS)
  const [cat, setCat] = useState<CatFilter>('all')
  const [diff, setDiff] = useState<DiffFilter>('all')
  const [progress, setProgress] = useState<Progress>({ practiced: [], bestBpm: {} })

  useEffect(() => {
    let alive = true
    fetchLicks().then((rows) => {
      if (alive) setLicks(rows)
    })
    setProgress(getProgress())
    return () => {
      alive = false
    }
  }, [])

  const cats = useMemo(() => {
    const present = new Set(licks.map((l) => l.category))
    return CATEGORY_ORDER.filter((c) => present.has(c))
  }, [licks])

  const filtered = useMemo(
    () =>
      licks.filter(
        (l) => (cat === 'all' || l.category === cat) && (diff === 'all' || l.difficulty === diff),
      ),
    [licks, cat, diff],
  )

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-[var(--color-ivory)] sm:text-5xl">SundayLicks</h1>
          <p className="mt-2 max-w-xl text-[var(--color-muted)]">
            Øv gospel- og lovsang-licks med opplyst klaviatur, live tempo og transponering til alle
            tonearter. Alt spilles fra noter — aldri lyd — så det aldri knirker.
          </p>
        </div>
        <Link
          href="/submit"
          className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-ivory)] transition-colors hover:border-[var(--color-amber)]/60"
        >
          <Plus className="h-4 w-4" /> Send inn en lick
        </Link>
      </header>

      {/* Filters */}
      <div className="mb-8 flex flex-col gap-3">
        <FilterRow label="Kategori">
          <Chip active={cat === 'all'} onClick={() => setCat('all')}>
            Alle
          </Chip>
          {cats.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {CATEGORY_LABEL[c]}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Nivå">
          <Chip active={diff === 'all'} onClick={() => setDiff('all')}>
            Alle
          </Chip>
          {([1, 2, 3] as Difficulty[]).map((d) => (
            <Chip key={d} active={diff === d} onClick={() => setDiff(d)}>
              {DIFFICULTY_LABEL[d]}
            </Chip>
          ))}
        </FilterRow>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="py-16 text-center text-[var(--color-muted)]">Ingen licks matcher filtrene.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => (
            <LickCard
              key={l.slug}
              lick={l}
              practiced={progress.practiced.includes(l.slug)}
              bestBpm={progress.bestBpm[l.slug]}
            />
          ))}
        </div>
      )}
    </main>
  )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 shrink-0 text-sm text-[var(--color-muted)]">{label}</span>
      {children}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-[var(--color-amber)] bg-[var(--color-amber)] text-[#171210]'
          : 'border-[var(--color-border)] bg-[var(--color-raised)] text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
      )}
    >
      {children}
    </button>
  )
}
