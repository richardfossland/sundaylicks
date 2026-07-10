'use client'

// "Bla gjennom licks" (/bla) — a reels-style vertical pager over the whole
// library. One full-height card per lick; settle on a card and it autoplays in
// your session key; like it → "Øv på denne", don't → keep flicking.
//
// Mechanics (see also lib/reel.ts + useReelPlayer.ts):
//   • Paging is pure CSS scroll-snap (no JS gesture handling): a snap container
//     whose height is `100dvh − <measured header height>` holds 163 full-height
//     snap sections. An IntersectionObserver (threshold 0.6) names the active
//     card; keyboard Arrow/Page/Space scroll the neighbour into view.
//   • Order is a stable random shuffle (seed in sessionStorage, 30-min TTL) so
//     re-renders and back-navigation don't reshuffle. The active index is
//     remembered and restored on mount (App Router doesn't restore scroll inside
//     a nested scroll container).
//   • Only the active card + its two neighbours mount heavy content
//     (transposed notes + PianoRoll + VexFlow); the rest are light placeholders.
//   • Header height is MEASURED (ResizeObserver), never hardcoded — the mobile
//     AppShell header wraps to two rows, so its height varies.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Lick } from '@/types/lick'
import { fetchLicks } from '@/lib/licks'
import { getProgress, type Progress } from '@/lib/progress'
import { useSession } from '@/lib/session'
import { loadOrCreateReelState, reelOrder, saveReelIndex } from '@/lib/reel'
import { ReelCard } from './ReelCard'
import { useReelPlayer } from './useReelPlayer'

const AUTOPLAY_STORAGE_KEY = 'sundaylicks_reel_autoplay'
const INDEX_SAVE_DEBOUNCE_MS = 400

export function BlaView() {
  const [licks, setLicks] = useState<Lick[] | null>(null)
  const [seed, setSeed] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [headerH, setHeaderH] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const [progress, setProgress] = useState<Progress>({ practiced: [], bestBpm: {}, lastPracticed: {} })

  const sessionKey = useSession((s) => s.key)
  const loadSession = useSession((s) => s.load)

  const containerRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const restoredRef = useRef(false)
  const initialIndexRef = useRef(0)

  // ── One-time client-side setup (all storage/shuffle in effects: hydration-safe) ──
  useEffect(() => {
    let alive = true
    fetchLicks().then((rows) => {
      if (alive) setLicks(rows)
    })
    loadSession()
    setProgress(getProgress())

    const reel = loadOrCreateReelState()
    setSeed(reel.seed)
    initialIndexRef.current = reel.index
    setActiveIndex(reel.index)

    try {
      const raw = localStorage.getItem(AUTOPLAY_STORAGE_KEY)
      if (raw !== null) setAutoplay(raw === '1')
    } catch {
      /* storage blocked — keep default ON */
    }
    return () => {
      alive = false
    }
  }, [loadSession])

  // ── Measure the sticky header (its height varies: two rows on mobile) ──
  useEffect(() => {
    const header = document.querySelector('header')
    if (!header) return
    const measure = () => setHeaderH(header.getBoundingClientRect().height)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(header)
    return () => ro.disconnect()
  }, [])

  // Memoisert: hver scroll setter activeIndex og re-rendrer — stokkingen skal
  // ikke gjøres om (identisk resultat, men unødig arbeid per frame-batch).
  const ordered = useMemo(() => (seed && licks ? reelOrder(licks, seed) : null), [seed, licks])
  const ready = ordered !== null && headerH > 0
  const total = ordered?.length ?? 0

  // Clamp a possibly-stale restored index against the current library size.
  const safeActive = total > 0 ? Math.min(activeIndex, total - 1) : 0
  const activeLick = ordered ? (ordered[safeActive] ?? null) : null

  const player = useReelPlayer({
    lick: activeLick,
    targetKey: sessionKey.root,
    autoplay,
    enabled: ready,
  })

  const scrollToIndex = useCallback((i: number, smooth: boolean) => {
    const el = sectionRefs.current[i]
    if (!el) return
    const reduce =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: smooth && !reduce ? 'smooth' : 'auto', block: 'start' })
  }, [])

  // ── IntersectionObserver → activeIndex ──
  useEffect(() => {
    const container = containerRef.current
    if (!container || !ready) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            const idx = Number((e.target as HTMLElement).dataset.index)
            if (!Number.isNaN(idx)) setActiveIndex(idx)
          }
        }
      },
      { root: container, threshold: [0.6] },
    )
    sectionRefs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [ready, total])

  // ── Restore the saved card once, before paint isn't guaranteed but 'auto' is instant ──
  useEffect(() => {
    if (!ready || restoredRef.current) return
    restoredRef.current = true
    const i = Math.min(initialIndexRef.current, total - 1)
    if (i > 0) scrollToIndex(i, false)
  }, [ready, total, scrollToIndex])

  // ── Keyboard paging ──
  useEffect(() => {
    if (!ready) return
    const onKey = (e: KeyboardEvent) => {
      let delta = 0
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') delta = 1
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') delta = -1
      else return
      e.preventDefault()
      const next = Math.min(Math.max(safeActive + delta, 0), total - 1)
      scrollToIndex(next, true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, safeActive, total, scrollToIndex])

  // ── Persist the active index (debounced; never rewrites the seed's freshness) ──
  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => saveReelIndex(safeActive), INDEX_SAVE_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [ready, safeActive])

  const toggleAutoplay = useCallback(() => {
    setAutoplay((v) => {
      const next = !v
      try {
        localStorage.setItem(AUTOPLAY_STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const containerHeight = `calc(100dvh - ${headerH}px)`

  if (!ready || !ordered) {
    // Skeleton until BOTH the header is measured and the licks have settled, so
    // the shuffle never visibly reshuffles from a fallback into fetched data.
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: headerH > 0 ? containerHeight : '100dvh' }}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6">
          <div className="h-8 w-2/3 animate-pulse rounded-lg bg-[var(--color-raised)]" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--color-raised)]" />
          <div className="h-[220px] w-full animate-pulse rounded-xl bg-[var(--color-surface)]" />
          <div className="h-12 w-full animate-pulse rounded-full bg-[var(--color-raised)]" />
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{ height: containerHeight }}
      className="snap-y snap-mandatory overflow-y-auto overscroll-contain"
    >
      {ordered.map((lick, i) => (
        <section
          key={lick.slug}
          ref={(el) => {
            sectionRefs.current[i] = el
          }}
          data-index={i}
          className="h-full snap-start snap-always"
        >
          <ReelCard
            lick={lick}
            index={i}
            total={total}
            active={i === safeActive}
            near={Math.abs(i - safeActive) <= 1}
            practiced={progress.practiced.includes(lick.slug)}
            targetKey={sessionKey.root}
            soundReady={player.soundReady}
            autoplay={autoplay}
            isLoading={player.isLoading}
            onReplay={player.replay}
            onToggleAutoplay={toggleAutoplay}
          />
        </section>
      ))}
    </div>
  )
}
