'use client'

import { create } from 'zustand'

// Favorites + user-made practice lists, per-device in localStorage (no auth).
// A Zustand store so every card / header stays in sync reactively. PLAN: no
// backend needed — this lives alongside progress.ts.

const KEY = 'sundaylicks_collections'

export interface PracticeList {
  id: string
  name: string
  slugs: string[]
}

interface Persisted {
  favorites: string[]
  lists: PracticeList[]
}

interface CollectionsState extends Persisted {
  hydrated: boolean
  load: () => void
  toggleFavorite: (slug: string) => void
  isFavorite: (slug: string) => boolean
  createList: (name: string) => string
  deleteList: (id: string) => void
  renameList: (id: string, name: string) => void
  toggleInList: (id: string, slug: string) => void
}

function read(): Persisted {
  if (typeof window === 'undefined') return { favorites: [], lists: [] }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { favorites: [], lists: [] }
    const p = JSON.parse(raw) as Partial<Persisted>
    return { favorites: p.favorites ?? [], lists: p.lists ?? [] }
  } catch {
    return { favorites: [], lists: [] }
  }
}

function write(p: Persisted) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ favorites: p.favorites, lists: p.lists }))
  } catch {
    /* storage blocked — ignore */
  }
}

export const useCollections = create<CollectionsState>((set, get) => ({
  favorites: [],
  lists: [],
  hydrated: false,

  load: () => set({ ...read(), hydrated: true }),

  isFavorite: (slug) => get().favorites.includes(slug),

  toggleFavorite: (slug) =>
    set((s) => {
      const favorites = s.favorites.includes(slug)
        ? s.favorites.filter((x) => x !== slug)
        : [...s.favorites, slug]
      const next = { favorites, lists: s.lists }
      write(next)
      return next
    }),

  createList: (name) => {
    const id = 'l_' + crypto.randomUUID().slice(0, 8)
    set((s) => {
      const next = { favorites: s.favorites, lists: [...s.lists, { id, name: name.trim() || 'Ny liste', slugs: [] }] }
      write(next)
      return next
    })
    return id
  },

  deleteList: (id) =>
    set((s) => {
      const next = { favorites: s.favorites, lists: s.lists.filter((l) => l.id !== id) }
      write(next)
      return next
    }),

  renameList: (id, name) =>
    set((s) => {
      const next = { favorites: s.favorites, lists: s.lists.map((l) => (l.id === id ? { ...l, name: name.trim() || l.name } : l)) }
      write(next)
      return next
    }),

  toggleInList: (id, slug) =>
    set((s) => {
      const next = {
        favorites: s.favorites,
        lists: s.lists.map((l) =>
          l.id === id
            ? { ...l, slugs: l.slugs.includes(slug) ? l.slugs.filter((x) => x !== slug) : [...l.slugs, slug] }
            : l,
        ),
      }
      write(next)
      return next
    }),
}))
