'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plus, Heart, Play, Trash2, ListMusic, Search } from 'lucide-react'
import type { Lick, Category, Genre, Difficulty } from '@/types/lick'
import { FALLBACK_LICKS, fetchLicks } from '@/lib/licks'
import { getProgress, type Progress } from '@/lib/progress'
import { useCollections } from '@/lib/collections'
import { LickCard } from '@/components/LickCard'
import { CATEGORY_LABEL, CATEGORY_ORDER, GENRE_LABEL, GENRE_ORDER, DIFFICULTY_LABEL } from '@/lib/labels'
import { cn } from '@/lib/cn'

type CatFilter = Category | 'all'
type GenreFilter = Genre | 'all'
type DiffFilter = Difficulty | 'all'
type Mode = 'all' | 'favs' | string // string = list id
type SortKey = 'default' | 'name' | 'difficulty' | 'bpm' | 'beats' | 'newest'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Standard' },
  { key: 'name', label: 'Navn' },
  { key: 'difficulty', label: 'Nivå' },
  { key: 'bpm', label: 'Tempo' },
  { key: 'beats', label: 'Lengde' },
  { key: 'newest', label: 'Nyeste' },
]

function isCategory(v: string | null): v is Category {
  return !!v && (CATEGORY_ORDER as string[]).includes(v)
}
function isGenre(v: string | null): v is Genre {
  return !!v && (GENRE_ORDER as string[]).includes(v)
}

/** The full, filterable/searchable library — favorites and practice lists live here too. */
export function ExploreView() {
  const searchParams = useSearchParams()
  const initialCat = searchParams.get('category')
  const initialGenre = searchParams.get('genre')
  const initialMode = searchParams.get('mode')

  const [licks, setLicks] = useState<Lick[]>(FALLBACK_LICKS)
  const [cat, setCat] = useState<CatFilter>(isCategory(initialCat) ? initialCat : 'all')
  const [genre, setGenre] = useState<GenreFilter>(isGenre(initialGenre) ? initialGenre : 'all')
  const [diff, setDiff] = useState<DiffFilter>('all')
  const [mode, setMode] = useState<Mode>(initialMode === 'favs' ? 'favs' : 'all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('default')
  const [progress, setProgress] = useState<Progress>({ practiced: [], bestBpm: {} })
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const favorites = useCollections((s) => s.favorites)
  const lists = useCollections((s) => s.lists)
  const loadCollections = useCollections((s) => s.load)
  const createList = useCollections((s) => s.createList)
  const deleteList = useCollections((s) => s.deleteList)

  useEffect(() => {
    let alive = true
    fetchLicks().then((rows) => {
      if (alive) setLicks(rows)
    })
    setProgress(getProgress())
    loadCollections()
    return () => {
      alive = false
    }
  }, [loadCollections])

  const bySlug = useMemo(() => new Map(licks.map((l) => [l.slug, l])), [licks])
  const activeList = useMemo(
    () => (mode !== 'all' && mode !== 'favs' ? (lists.find((l) => l.id === mode) ?? null) : null),
    [mode, lists],
  )

  const genres = useMemo(() => {
    const present = new Set(licks.map((l) => l.genre))
    return GENRE_ORDER.filter((g) => present.has(g))
  }, [licks])
  const cats = useMemo(() => {
    const present = new Set(licks.map((l) => l.category))
    return CATEGORY_ORDER.filter((c) => present.has(c))
  }, [licks])

  const filtered = useMemo(() => {
    if (activeList) {
      return activeList.slugs.map((s) => bySlug.get(s)).filter(Boolean) as Lick[]
    }
    const q = query.trim().toLowerCase()
    const idx = new Map(licks.map((l, i) => [l.slug, i]))
    const out = licks.filter(
      (l) =>
        (mode !== 'favs' || favorites.includes(l.slug)) &&
        (cat === 'all' || l.category === cat) &&
        (genre === 'all' || l.genre === genre) &&
        (diff === 'all' || l.difficulty === diff) &&
        (q === '' ||
          l.name.toLowerCase().includes(q) ||
          (l.description ?? '').toLowerCase().includes(q) ||
          l.tags.some((t) => t.toLowerCase().includes(q))),
    )
    const cmp: Record<SortKey, (a: Lick, b: Lick) => number> = {
      default: (a, b) => (idx.get(a.slug)! - idx.get(b.slug)!),
      name: (a, b) => a.name.localeCompare(b.name, 'no'),
      difficulty: (a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name, 'no'),
      bpm: (a, b) => a.default_bpm - b.default_bpm,
      beats: (a, b) => a.beats - b.beats,
      newest: (a, b) => (idx.get(b.slug)! - idx.get(a.slug)!),
    }
    return [...out].sort(cmp[sort])
  }, [licks, activeList, mode, favorites, cat, genre, diff, query, sort, bySlug])

  const startCreate = () => {
    const id = createList(newName)
    setNewName('')
    setCreating(false)
    setMode(id)
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-[var(--color-ivory)] sm:text-4xl">Utforsk biblioteket</h1>
        <p className="mt-2 max-w-xl text-[var(--color-muted)]">
          Alle licks, søkbare og filtrerbare — kategori, sjanger, nivå, dine favoritter og øvingslister.
        </p>
      </header>

      {/* Collections: favorites + practice lists */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="w-16 shrink-0 text-sm text-[var(--color-muted)]">Samlinger</span>
        <Chip active={mode === 'all'} onClick={() => setMode('all')}>
          Alle
        </Chip>
        <Chip active={mode === 'favs'} onClick={() => setMode('favs')}>
          <Heart className="mr-1 inline h-3.5 w-3.5" fill={mode === 'favs' ? 'currentColor' : 'none'} />
          Favoritter{favorites.length > 0 ? ` (${favorites.length})` : ''}
        </Chip>
        {lists.map((l) => (
          <Chip key={l.id} active={mode === l.id} onClick={() => setMode(l.id)}>
            <ListMusic className="mr-1 inline h-3.5 w-3.5" />
            {l.name} ({l.slugs.length})
          </Chip>
        ))}
        {creating ? (
          <span className="flex items-center gap-1">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') startCreate()
                if (e.key === 'Escape') setCreating(false)
              }}
              placeholder="Listenavn"
              className="w-32 rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] px-3 py-1.5 text-sm text-[var(--color-ivory)] outline-none focus:border-[var(--color-amber)]"
            />
            <button onClick={startCreate} className="rounded-full bg-[var(--color-amber)] px-3 py-1.5 text-sm font-medium text-[#171210]">
              Lag
            </button>
          </span>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1 rounded-full border border-dashed border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ivory)]"
          >
            <Plus className="h-3.5 w-3.5" /> Ny liste
          </button>
        )}
      </div>

      {/* Filters (hidden in list mode — a list shows its whole contents) */}
      {!activeList && (
        <div className="mb-8 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Søk i navn, tagger, beskrivelse…"
                className="w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-3 text-sm text-[var(--color-ivory)] outline-none focus:border-[var(--color-amber)]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-muted)]">Sorter</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] px-3 py-2 text-sm text-[var(--color-ivory)] outline-none focus:border-[var(--color-amber)]"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <FilterRow label="Sjanger">
            <Chip active={genre === 'all'} onClick={() => setGenre('all')}>
              Alle
            </Chip>
            {genres.map((g) => (
              <Chip key={g} active={genre === g} onClick={() => setGenre(g)}>
                {GENRE_LABEL[g]}
              </Chip>
            ))}
          </FilterRow>
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
      )}

      {/* List header with practice + delete */}
      {activeList && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div>
            <h2 className="font-display text-2xl text-[var(--color-ivory)]">{activeList.name}</h2>
            <p className="text-sm text-[var(--color-muted)]">{activeList.slugs.length} licks i lista</p>
          </div>
          <div className="flex items-center gap-2">
            {activeList.slugs.length > 0 && (
              <Link
                href={`/lick/${activeList.slugs[0]}?list=${activeList.id}&i=0`}
                className="flex items-center gap-1.5 rounded-full bg-[var(--color-amber)] px-4 py-2 text-sm font-medium text-[#171210]"
              >
                <Play className="h-4 w-4" fill="currentColor" /> Start øving
              </Link>
            )}
            <button
              onClick={() => {
                deleteList(activeList.id)
                setMode('all')
              }}
              className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3.5 py-2 text-sm text-[var(--color-muted)] hover:text-[#C7534E]"
            >
              <Trash2 className="h-4 w-4" /> Slett
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="py-16 text-center text-[var(--color-muted)]">
          {mode === 'favs'
            ? 'Ingen favoritter enda — trykk hjertet på en lick.'
            : activeList
              ? 'Lista er tom — åpne en lick og bruk «Legg til i liste».'
              : 'Ingen licks matcher filtrene.'}
        </p>
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
