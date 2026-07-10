'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { BarChart3, BookOpen, MoreHorizontal, Plus } from 'lucide-react'
import { MODES, ACCENT_CLASSES, type ModeId } from '@/lib/modes'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/cn'

/**
 * AppShell — the mode-based replacement for the old global SiteHeader.
 *
 * CONTRACT (read this before wiring up a mode's routes):
 *
 *   AppShell is NOT mounted globally in `layout.tsx`. Each route wraps its
 *   OWN content in it, and tells it which mode it belongs to:
 *
 *     export default function OvePage() {
 *       return (
 *         <AppShell mode="ove">
 *           <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
 *             ...page content...
 *           </main>
 *         </AppShell>
 *       )
 *     }
 *
 *   Why per-page instead of one root mount: the whole point of W1 is that the
 *   shell's colour/title/active pill CHANGE per mode — a single static
 *   instance in the root layout can't express that without prop-drilling
 *   through the App Router's server/client boundary. Wrapping per-page keeps
 *   the "what mode am I in" declaration next to the code that needs it, and
 *   it's exactly one extra line per page.
 *
 *   - `mode` is optional. Omit it (or pass nothing) for mode-agnostic pages —
 *     the launcher (`/`), `/stats`, `/submit`, `/lick/[slug]`, etc. AppShell
 *     then shows the bare brand chrome with no mode highlighted.
 *   - AppShell renders ONLY the topbar; it does not add page padding or a
 *     `<main>` wrapper. Your page owns its own `<main>` and layout, same as
 *     before (see the placeholder routes in ove/kurs/spill for the pattern).
 *   - The 3-mode registry (label, tagline, accent, icon) lives in
 *     `@/lib/modes` — that's the single source of truth AppShell, ModeCard,
 *     and every mode's own pages should read from. Don't hardcode mode
 *     names/colours in page code; import from there.
 *   - There is deliberately no global KeySelector here any more — /spill
 *     (W4) owns toneart-selection UI now.
 */
export function AppShell({ mode, children }: { mode?: ModeId; children: React.ReactNode }) {
  const current = MODES.find((m) => m.id === mode)

  // Global lyd-preferanse → motor. AppShell er montert på hver side, så dette
  // dekker Practice, /bla, oppslagsverk-demoer og vent-modus i ett. Dynamisk
  // import holder Tone ute av shell-/server-bundelen; load() er idempotent.
  const instrument = useSession((s) => s.instrument)
  const loadSession = useSession((s) => s.load)
  useEffect(() => {
    loadSession()
  }, [loadSession])
  useEffect(() => {
    void import('@/lib/playback').then((m) => m.getEngine().setInstrument(instrument))
  }, [instrument])

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-scene)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-scene)]/80">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 font-display text-lg text-[var(--color-ivory)] sm:text-xl"
            >
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[var(--color-amber)]" />
              SundayLicks
            </Link>
            {current && (
              <>
                <span aria-hidden className="hidden h-4 w-px shrink-0 bg-[var(--color-border)] sm:block" />
                <span
                  className={cn(
                    'hidden truncate font-display text-base sm:block',
                    ACCENT_CLASSES[current.accent].text,
                  )}
                >
                  {current.label}
                </span>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ModeSwitcher current={mode} />
            <OverflowMenu />
          </div>

          {current && (
            <span
              className={cn(
                'order-3 basis-full truncate font-display text-sm sm:hidden',
                ACCENT_CLASSES[current.accent].text,
              )}
            >
              {current.label}
            </span>
          )}
        </div>
      </header>

      {children}
    </div>
  )
}

/** Compact icon-only switcher — jump between the 3 modes without going home. */
function ModeSwitcher({ current }: { current?: ModeId }) {
  return (
    <nav
      aria-label="Bytt modus"
      className="flex shrink-0 items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] p-1"
    >
      {MODES.map((m) => {
        const active = m.id === current
        const Icon = m.icon
        const accent = ACCENT_CLASSES[m.accent]
        return (
          <Link
            key={m.id}
            href={`/${m.slug}`}
            aria-current={active ? 'page' : undefined}
            aria-label={m.label}
            title={m.label}
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors sm:h-10 sm:w-10',
              active ? cn(accent.bg, accent.ink) : 'text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
            )}
          >
            <Icon className="h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]" strokeWidth={2} />
          </Link>
        )
      })}
    </nav>
  )
}

/** Discreet "…" menu — the few things every mode still needs (stats, submit). */
function OverflowMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Mer"
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] text-[var(--color-muted)] transition-colors hover:text-[var(--color-ivory)] sm:h-10 sm:w-10"
      >
        <MoreHorizontal className="h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]" />
      </button>
      {open && (
        <div
          role="menu"
          className="animate-fade-in absolute right-0 top-[calc(100%+0.5rem)] z-40 w-48 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1.5 shadow-lg shadow-black/40"
        >
          <Link
            role="menuitem"
            href="/oppslagsverk"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-ivory)] transition-colors hover:bg-[var(--color-raised)]"
          >
            <BookOpen className="h-4 w-4 text-[var(--color-muted)]" /> Oppslagsverk
          </Link>
          <Link
            role="menuitem"
            href="/stats"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-ivory)] transition-colors hover:bg-[var(--color-raised)]"
          >
            <BarChart3 className="h-4 w-4 text-[var(--color-muted)]" /> Stats
          </Link>
          <Link
            role="menuitem"
            href="/submit"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-ivory)] transition-colors hover:bg-[var(--color-raised)]"
          >
            <Plus className="h-4 w-4 text-[var(--color-muted)]" /> Send inn en lick
          </Link>
        </div>
      )}
    </div>
  )
}
