'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles, X } from 'lucide-react'
import type { Lick } from '@/types/lick'
import { FALLBACK_LICKS, fetchLicks } from '@/lib/licks'
import { getProgress, type Progress } from '@/lib/progress'
import { useSession } from '@/lib/session'
import { KEY_NAMES } from '@/lib/music'
import { CATEGORY_LABEL, GENRE_LABEL } from '@/lib/labels'
import { CURATED_PATHS } from '@/data/curated-paths'
import { computeCourseProgress } from '@/app/kurs/course-progress'
import { MODES, type ModeId } from '@/lib/modes'
import { AppShell } from '@/components/AppShell'
import { ModeCard } from '@/components/ModeCard'
import { cn } from '@/lib/cn'

const SEEN_INTRO_KEY = 'sundaylicks_seen_intro'

/**
 * The launcher — "velg hva du vil gjøre". Replaces the old 8-block dashboard.
 * Three big ModeCards ARE the app; everything else here is either a one-time
 * explainer or a shortcut back into whatever was last in progress.
 */
export default function LauncherPage() {
  const [licks, setLicks] = useState<Lick[]>(FALLBACK_LICKS)
  const [progress, setProgress] = useState<Progress>({ practiced: [], bestBpm: {} })
  const [showIntro, setShowIntro] = useState(false)
  const [mounted, setMounted] = useState(false)

  const sessionKey = useSession((s) => s.key)
  const loadSession = useSession((s) => s.load)

  useEffect(() => {
    let alive = true
    fetchLicks().then((rows) => {
      if (alive) setLicks(rows)
    })
    setProgress(getProgress())
    loadSession()
    setMounted(true)
    try {
      if (!localStorage.getItem(SEEN_INTRO_KEY)) setShowIntro(true)
    } catch {
      /* storage blocked — just skip the banner */
    }
    return () => {
      alive = false
    }
  }, [loadSession])

  function dismissIntro() {
    setShowIntro(false)
    try {
      localStorage.setItem(SEEN_INTRO_KEY, '1')
    } catch {
      /* storage blocked — nothing to persist, banner just won't return this session */
    }
  }

  const lastLick = useMemo(() => {
    const slug = progress.practiced.at(-1)
    if (!slug) return null
    return licks.find((l) => l.slug === slug) ?? null
  }, [progress.practiced, licks])

  const inProgressPath = useMemo(() => {
    for (const p of CURATED_PATHS) {
      const done = p.slugs.filter((s) => progress.practiced.includes(s)).length
      if (done > 0 && done < p.slugs.length) return { path: p, done }
    }
    return null
  }, [progress.practiced])

  // Per-mode progress line, computed only after mount so the server render and
  // the first client render match (starts empty → no hydration mismatch).
  const modeStats = useMemo<Partial<Record<ModeId, string>>>(() => {
    if (!mounted) return {}
    const practicedSet = new Set(progress.practiced)
    const practicedCount = licks.filter((l) => practicedSet.has(l.slug)).length
    const coursesDone = CURATED_PATHS.filter(
      (p) => computeCourseProgress(p, progress.practiced).status === 'done',
    ).length
    return {
      ove: `${practicedCount} av ${licks.length} licks øvd`,
      kurs: `${coursesDone} av ${CURATED_PATHS.length} kurs fullført`,
    }
  }, [mounted, licks, progress.practiced])

  const keyLabel = `${KEY_NAMES[sessionKey.root]}${sessionKey.mode === 'minor' ? '-moll' : '-dur'}`
  const hasContinueData = Boolean(lastLick || inProgressPath)

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        {showIntro && <IntroBanner onDismiss={dismissIntro} />}

        <header className="mb-8 sm:mb-10">
          <h1 className="font-display text-3xl text-[var(--color-ivory)] sm:text-4xl">Hva vil du gjøre?</h1>
          <p className="mt-2 max-w-xl text-[var(--color-muted)]">
            Velg en modus for å komme i gang. Du kan alltid bytte fra menyen øverst.
          </p>
        </header>

        {hasContinueData && (
          <section className="mb-8 sm:mb-10" aria-label="Fortsett der du slapp">
            <h2 className="mb-3 font-display text-lg text-[var(--color-ivory)]">Fortsett der du slapp</h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              {lastLick && (
                <Link
                  href={`/lick/${lastLick.slug}`}
                  className="group flex flex-1 items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 transition-colors hover:border-[var(--color-amber)]/60"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-base text-[var(--color-ivory)]">{lastLick.name}</p>
                    <p className="mt-0.5 truncate text-sm text-[var(--color-muted)]">
                      {CATEGORY_LABEL[lastLick.category]} · {GENRE_LABEL[lastLick.genre]} · {keyLabel}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-amber)] opacity-80 transition-opacity group-hover:opacity-100" />
                </Link>
              )}
              {inProgressPath && (
                <Link
                  href={`/lick/${inProgressPath.path.slugs[inProgressPath.done]}?path=${inProgressPath.path.id}&i=${inProgressPath.done}`}
                  className="group flex flex-1 items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 transition-colors hover:border-[var(--color-sea)]/60"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-base text-[var(--color-ivory)]">{inProgressPath.path.name}</p>
                    <p className="mt-0.5 truncate text-sm text-[var(--color-muted)]">
                      Kurs · {inProgressPath.done}/{inProgressPath.path.slugs.length} øvd
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-sea)] opacity-80 transition-opacity group-hover:opacity-100" />
                </Link>
              )}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {MODES.map((m) => (
            <ModeCard key={m.id} mode={m} stat={modeStats[m.id]} />
          ))}
        </div>
      </main>
    </AppShell>
  )
}

function IntroBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="animate-fade-in mb-8 flex items-start gap-3 rounded-2xl border border-[var(--color-amber)]/30 bg-[var(--color-amber)]/8 p-4 sm:p-5">
      <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-amber)]" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-base text-[var(--color-ivory)]">Tre måter å bruke SundayLicks på</p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
          Velg et kort under for å starte — alt du gjør lagres lokalt på denne enheten.
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Lukk forklaringen"
        className={cn(
          'grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--color-muted)] transition-colors hover:text-[var(--color-ivory)]',
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
