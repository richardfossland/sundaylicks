'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Plus,
  Heart,
  Play,
  Trash2,
  ListMusic,
  Search,
  SlidersHorizontal,
  ChevronDown,
  X,
} from 'lucide-react'
import type { Lick, Category, Genre, Difficulty } from '@/types/lick'
import { FALLBACK_LICKS, fetchLicks } from '@/lib/licks'
import { getProgress, type Progress } from '@/lib/progress'
import { useCollections } from '@/lib/collections'
import { LickCard } from '@/components/LickCard'
import { CATEGORY_LABEL, CATEGORY_ORDER, GENRE_LABEL, GENRE_ORDER, DIFFICULTY_LABEL } from '@/lib/labels'
import { ACCENT_CLASSES } from '@/lib/modes'
import { cn } from '@/lib/cn'

type CatFilter = Category | 'all'
type GenreFilter = Genre | 'all'
type DiffFilter = Difficulty | 'all'
/** Top-level lens: the whole library, or just what the user has collected. */
type ViewTab = 'all' | 'mine'
/** Within "Mine lister": favorites, or a specific practice list by id. */
type MineTab = 'favs' | string
type SortKey = 'default' | 'name' | 'difficulty' | 'bpm' | 'beats' | 'newest'

const amber = ACCENT_CLASSES.amber

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

/**
 * The Øv-modus library: a focused workspace over the full lick catalogue.
 *
 * Design (W2): the old /utforsk had 3 always-open filter rows plus a
 * separate "Samlinger" row, and favorites/lists could only be reached via a
 * `?mode=favs` nav hack. Here that collapses to:
 *   - a top-level "Alle licks | Mine lister" tab (Mine lister owns
 *     favorites + practice lists — no more query-param hack)
 *   - one search field + a single "Filtrer" button that unfolds
 *     sjanger/kategori/nivå, with active filters surfaced as dismissible
 *     chips so you never have to reopen the panel to see what's applied
 *   - sorting stays a plain, always-visible control
 * All prior functionality (search, every filter, every sort, favorites,
 * practice lists incl. create/delete/"start øving") is preserved.
 */
export function OveView() {
  const searchParams = useSearchParams()
  const initialCat = searchParams.get('category')
  const initialGenre = searchParams.get('genre')

  const [licks, setLicks] = useState<Lick[]>(FALLBACK_LICKS)
  const [view, setView] = useState<ViewTab>('all')
  const [mineTab, setMineTab] = useState<MineTab>('favs')
  const [cat, setCat] = useState<CatFilter>(isCategory(initialCat) ? initialCat : 'all')
  const [genre, setGenre] = useState<GenreFilter>(isGenre(initialGenre) ? initialGenre : 'all')
  const [diff, setDiff] = useState<DiffFilter>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('default')
  const [filterOpen, setFilterOpen] = useState(false)
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
  const showFavs = view === 'mine' && mineTab === 'favs'
  const activeList = useMemo(
    () => (view === 'mine' && mineTab !== 'favs' ? (lists.find((l) => l.id === mineTab) ?? null) : null),
    [view, mineTab, lists],
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
        (!showFavs || favorites.includes(l.slug)) &&
        (cat === 'all' || l.category === cat) &&
        (genre === 'all' || l.genre === genre) &&
        (diff === 'all' || l.difficulty === diff) &&
        (q === '' ||
          l.name.toLowerCase().includes(q) ||
          (l.description ?? '').toLowerCase().includes(q) ||
          l.tags.some((t) => t.toLowerCase().includes(q))),
    )
    const cmp: Record<SortKey, (a: Lick, b: Lick) => number> = {
      default: (a, b) => idx.get(a.slug)! - idx.get(b.slug)!,
      name: (a, b) => a.name.localeCompare(b.name, 'no'),
      difficulty: (a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name, 'no'),
      bpm: (a, b) => a.default_bpm - b.default_bpm,
      beats: (a, b) => a.beats - b.beats,
      newest: (a, b) => idx.get(b.slug)! - idx.get(a.slug)!,
    }
    return [...out].sort(cmp[sort])
  }, [licks, activeList, showFavs, favorites, cat, genre, diff, query, sort, bySlug])

  const activeFilterCount = (cat !== 'all' ? 1 : 0) + (genre !== 'all' ? 1 : 0) + (diff !== 'all' ? 1 : 0)

  const startCreate = () => {
    const id = createList(newName)
    setNewName('')
    setCreating(false)
    setMineTab(id)
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-[var(--color-ivory)] sm:text-4xl">Øv på licks</h1>
        <p className="mt-2 max-w-xl text-[var(--color-muted)]">
          Bla i biblioteket, søk og filtrer — eller hopp rett til favorittene og øvingslistene dine.
        </p>
      </header>

      {/* Top-level lens: the whole library vs. what you've collected */}
      <div
        role="tablist"
        aria-label="Bibliotek-visning"
        className="mb-6 inline-flex items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] p-1"
      >
        <ViewTabButton active={view === 'all'} onClick={() => setView('all')}>
          Alle licks
        </ViewTabButton>
        <ViewTabButton active={view === 'mine'} onClick={() => setView('mine')}>
          Mine lister
        </ViewTabButton>
      </div>

      {/* Favorites + practice lists — only surfaced inside "Mine lister" now,
          replacing the old `/utforsk?mode=favs` nav hack. */}
      {view === 'mine' && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Chip active={mineTab === 'favs'} onClick={() => setMineTab('favs')}>
            <Heart className="mr-1 inline h-3.5 w-3.5" fill={mineTab === 'favs' ? 'currentColor' : 'none'} />
            Favoritter{favorites.length > 0 ? ` (${favorites.length})` : ''}
          </Chip>
          {lists.map((l) => (
            <Chip key={l.id} active={mineTab === l.id} onClick={() => setMineTab(l.id)}>
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
              <button
                onClick={startCreate}
                className={cn('rounded-full px-3 py-1.5 text-sm font-medium', amber.bg, amber.ink)}
              >
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
      )}

      {/* Search + progressive filters + sort — hidden for a specific
          practice list, which always shows its whole (unfiltered) contents. */}
      {!activeList && (
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Søk i navn, tagger, beskrivelse…"
                className="w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-9 text-sm text-[var(--color-ivory)] outline-none focus:border-[var(--color-amber)]"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Tøm søk"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-[var(--color-muted)] hover:text-[var(--color-ivory)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <FilterToggleButton open={filterOpen} count={activeFilterCount} onClick={() => setFilterOpen((v) => !v)} />
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

          <ActiveFilterChips
            genre={genre}
            cat={cat}
            diff={diff}
            onClearGenre={() => setGenre('all')}
            onClearCat={() => setCat('all')}
            onClearDiff={() => setDiff('all')}
            onClearAll={() => {
              setGenre('all')
              setCat('all')
              setDiff('all')
            }}
          />

          {filterOpen && (
            <div
              id="ove-filter-panel"
              className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
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
              {activeFilterCount > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setGenre('all')
                      setCat('all')
                      setDiff('all')
                    }}
                    className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ivory)]"
                  >
                    Nullstill filtre
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Practice-list header with practice + delete */}
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
                className={cn('flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium', amber.bg, amber.ink)}
              >
                <Play className="h-4 w-4" fill="currentColor" /> Start øving
              </Link>
            )}
            <button
              onClick={() => {
                deleteList(activeList.id)
                setMineTab('favs')
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
          {showFavs
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

function ViewTabButton({
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
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
        active ? cn(amber.bg, amber.ink) : 'text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
      )}
    >
      {children}
    </button>
  )
}

function FilterToggleButton({
  open,
  count,
  onClick,
}: {
  open: boolean
  count: number
  onClick: () => void
}) {
  const engaged = open || count > 0
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls="ove-filter-panel"
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
        engaged
          ? cn(amber.border, amber.softBg, amber.softText)
          : 'border-[var(--color-border)] bg-[var(--color-raised)] text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
      )}
    >
      <SlidersHorizontal className="h-4 w-4" />
      Filtrer
      {count > 0 && (
        <span className={cn('grid h-5 w-5 place-items-center rounded-full text-xs font-semibold', amber.bg, amber.ink)}>
          {count}
        </span>
      )}
      <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
    </button>
  )
}

function ActiveFilterChips({
  genre,
  cat,
  diff,
  onClearGenre,
  onClearCat,
  onClearDiff,
  onClearAll,
}: {
  genre: GenreFilter
  cat: CatFilter
  diff: DiffFilter
  onClearGenre: () => void
  onClearCat: () => void
  onClearDiff: () => void
  onClearAll: () => void
}) {
  const chips: { key: string; label: string; onClear: () => void }[] = []
  if (genre !== 'all') chips.push({ key: 'genre', label: GENRE_LABEL[genre], onClear: onClearGenre })
  if (cat !== 'all') chips.push({ key: 'cat', label: CATEGORY_LABEL[cat], onClear: onClearCat })
  if (diff !== 'all') chips.push({ key: 'diff', label: DIFFICULTY_LABEL[diff], onClear: onClearDiff })
  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.onClear}
          aria-label={`Fjern filter: ${c.label}`}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
            amber.border,
            amber.softBg,
            amber.softText,
          )}
        >
          {c.label}
          <X className="h-3 w-3" />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-ivory)] hover:underline"
        >
          Nullstill alle
        </button>
      )}
    </div>
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
          ? cn(amber.border, amber.bg, amber.ink)
          : 'border-[var(--color-border)] bg-[var(--color-raised)] text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
      )}
    >
      {children}
    </button>
  )
}
