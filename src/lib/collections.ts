'use client'

import { create } from 'zustand'
import type { Lick } from '@/types/lick'

// Favorites + user-made practice lists, per-device in localStorage (no auth).
// A Zustand store so every card / header stays in sync reactively. PLAN: no
// backend needed — this lives alongside progress.ts.

const KEY = 'sundaylicks_collections'

// A collection entry is either a reference to a library lick (by slug — the
// original, still-only shape) or an inline, fully-serialized generated Lick
// (workstream D/E: preview a lick that may not exist in the DB at all, or
// isn't published yet). `kind: 'slug'` entries are what every pre-existing
// localStorage payload contains.
export type CollectionRef = { kind: 'slug'; slug: string } | { kind: 'lick'; lick: Lick }

function refKey(ref: CollectionRef): string {
  return ref.kind === 'slug' ? ref.slug : ref.lick.id
}

export interface PracticeList {
  id: string
  name: string
  /** Slug-only view, derived from `items` — kept for backward compatibility
   * with existing consumers (e.g. the library page) that only ever dealt in
   * slugs. Always in sync with the `kind: 'slug'` entries of `items`. */
  slugs: string[]
  /** Full model: slug refs + inline generated licks, in list order. */
  items: CollectionRef[]
}

interface Persisted {
  /** Slug-only view, derived from `favoriteRefs` — see `PracticeList.slugs`. */
  favorites: string[]
  favoriteRefs: CollectionRef[]
  lists: PracticeList[]
}

interface CollectionsState extends Persisted {
  hydrated: boolean
  load: () => void
  toggleFavorite: (slug: string) => void
  isFavorite: (slug: string) => boolean
  /** Favorite/unfavorite an inline generated Lick (not a library slug). */
  toggleFavoriteLick: (lick: Lick) => void
  isFavoriteLick: (id: string) => boolean
  createList: (name: string) => string
  deleteList: (id: string) => void
  renameList: (id: string, name: string) => void
  toggleInList: (id: string, slug: string) => void
  /** Add/remove an inline generated Lick to/from a list. */
  toggleLickInList: (id: string, lick: Lick) => void
}

function slugsOf(items: CollectionRef[]): string[] {
  return items.filter((r): r is { kind: 'slug'; slug: string } => r.kind === 'slug').map((r) => r.slug)
}

function toggleRef(items: CollectionRef[], ref: CollectionRef): CollectionRef[] {
  const k = refKey(ref)
  return items.some((r) => refKey(r) === k) ? items.filter((r) => refKey(r) !== k) : [...items, ref]
}

// Migrate a possibly-legacy persisted list/favorites shape (pre-`items`) into
// the current one. Old payloads have `slugs: string[]` / `favorites: string[]`
// only; new ones carry the full `items`/`favoriteRefs`.
function migrateList(l: Partial<PracticeList> & { id: string; name: string }): PracticeList {
  const items: CollectionRef[] = l.items ?? (l.slugs ?? []).map((slug) => ({ kind: 'slug', slug }) as const)
  return { id: l.id, name: l.name, items, slugs: slugsOf(items) }
}

function read(): Persisted {
  if (typeof window === 'undefined') return { favorites: [], favoriteRefs: [], lists: [] }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { favorites: [], favoriteRefs: [], lists: [] }
    const p = JSON.parse(raw) as Partial<Persisted> & { favorites?: string[] }
    const favoriteRefs: CollectionRef[] =
      p.favoriteRefs ?? (p.favorites ?? []).map((slug) => ({ kind: 'slug', slug }) as const)
    const lists = (p.lists ?? []).map((l) => migrateList(l as Partial<PracticeList> & { id: string; name: string }))
    return { favorites: slugsOf(favoriteRefs), favoriteRefs, lists }
  } catch {
    return { favorites: [], favoriteRefs: [], lists: [] }
  }
}

function write(p: Persisted) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ favorites: p.favorites, favoriteRefs: p.favoriteRefs, lists: p.lists }),
    )
  } catch {
    /* storage blocked — ignore */
  }
}

export const useCollections = create<CollectionsState>((set, get) => ({
  favorites: [],
  favoriteRefs: [],
  lists: [],
  hydrated: false,

  load: () => set({ ...read(), hydrated: true }),

  isFavorite: (slug) => get().favorites.includes(slug),
  isFavoriteLick: (id) => get().favoriteRefs.some((r) => r.kind === 'lick' && r.lick.id === id),

  toggleFavorite: (slug) =>
    set((s) => {
      const favoriteRefs = toggleRef(s.favoriteRefs, { kind: 'slug', slug })
      const next = { favorites: slugsOf(favoriteRefs), favoriteRefs, lists: s.lists }
      write(next)
      return next
    }),

  toggleFavoriteLick: (lick) =>
    set((s) => {
      const favoriteRefs = toggleRef(s.favoriteRefs, { kind: 'lick', lick })
      const next = { favorites: slugsOf(favoriteRefs), favoriteRefs, lists: s.lists }
      write(next)
      return next
    }),

  createList: (name) => {
    const id = 'l_' + crypto.randomUUID().slice(0, 8)
    set((s) => {
      const list: PracticeList = { id, name: name.trim() || 'Ny liste', slugs: [], items: [] }
      const next = { favorites: s.favorites, favoriteRefs: s.favoriteRefs, lists: [...s.lists, list] }
      write(next)
      return next
    })
    return id
  },

  deleteList: (id) =>
    set((s) => {
      const next = {
        favorites: s.favorites,
        favoriteRefs: s.favoriteRefs,
        lists: s.lists.filter((l) => l.id !== id),
      }
      write(next)
      return next
    }),

  renameList: (id, name) =>
    set((s) => {
      const next = {
        favorites: s.favorites,
        favoriteRefs: s.favoriteRefs,
        lists: s.lists.map((l) => (l.id === id ? { ...l, name: name.trim() || l.name } : l)),
      }
      write(next)
      return next
    }),

  toggleInList: (id, slug) =>
    set((s) => {
      const next = {
        favorites: s.favorites,
        favoriteRefs: s.favoriteRefs,
        lists: s.lists.map((l) => {
          if (l.id !== id) return l
          const items = toggleRef(l.items, { kind: 'slug', slug })
          return { ...l, items, slugs: slugsOf(items) }
        }),
      }
      write(next)
      return next
    }),

  toggleLickInList: (id, lick) =>
    set((s) => {
      const next = {
        favorites: s.favorites,
        favoriteRefs: s.favoriteRefs,
        lists: s.lists.map((l) => {
          if (l.id !== id) return l
          const items = toggleRef(l.items, { kind: 'lick', lick })
          return { ...l, items, slugs: slugsOf(items) }
        }),
      }
      write(next)
      return next
    }),
}))
