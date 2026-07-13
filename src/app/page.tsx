'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import type { Lick } from '@/types/lick'
import { FALLBACK_LICKS, fetchLicks } from '@/lib/licks'
import { getProgress, type Progress } from '@/lib/progress'
import { useSession } from '@/lib/session'
import { KEY_NAMES } from '@/lib/music'
import { CATEGORY_LABEL, GENRE_LABEL } from '@/lib/labels'
import { CURATED_PATHS } from '@/data/curated-paths'
import { computeCourseProgress } from '@/app/kurs/course-progress'
import { MODES, type ModeId } from '@/lib/modes'
import { isOnboarded, setOnboarded, shouldShowOnboarding } from '@/lib/onboarding'
import { AppShell } from '@/components/AppShell'
import { ModeCard } from '@/components/ModeCard'
import { DailyCard } from '@/components/DailyCard'

/** Legacy: det gamle intro-banneret. Beholdt kun for å migrere gamle brukere
 * stille (så de aldri får den nye onboardingen tvunget på seg). */
const SEEN_INTRO_KEY = 'sundaylicks_seen_intro'

// Onboarding-overlayet drar inn Tone via audio-unlock → last det klient-only,
// og bare når det faktisk skal vises (fersk profil).
const Onboarding = dynamic(() => import('@/components/onboarding/Onboarding').then((m) => m.Onboarding), {
  ssr: false,
})

/**
 * The launcher — "velg hva du vil gjøre". Replaces the old 8-block dashboard.
 * Three big ModeCards ARE the app; everything else here is either a shortcut
 * back into whatever was last in progress or (for a brand-new profile) the
 * one-time interactive onboarding overlay.
 */
export default function LauncherPage() {
  const router = useRouter()
  const [licks, setLicks] = useState<Lick[]>(FALLBACK_LICKS)
  const [progress, setProgress] = useState<Progress>({ practiced: [], bestBpm: {}, lastPracticed: {} })
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [mounted, setMounted] = useState(false)

  const sessionKey = useSession((s) => s.key)
  const loadSession = useSession((s) => s.load)

  useEffect(() => {
    let alive = true
    fetchLicks().then((rows) => {
      if (alive) setLicks(rows)
    })
    const prog = getProgress()
    setProgress(prog)
    loadSession()
    setMounted(true)

    // Onboarding-porten: eksisterende brukere (gammelt intro-flagg ELLER minst
    // én øvd lick) migreres stille; bare en helt fersk profil ser overlayet.
    let seenOldIntro = false
    try {
      seenOldIntro = Boolean(localStorage.getItem(SEEN_INTRO_KEY))
    } catch {
      /* storage blocked — treat as not seen */
    }
    const gate = shouldShowOnboarding({
      onboarded: isOnboarded(),
      seenOldIntro,
      practicedCount: prog.practiced.length,
    })
    if (gate.migrateSilently) setOnboarded()
    if (gate.show) setShowOnboarding(true)

    // Re-read progress when returning to the tab (e.g. after practicing a lick),
    // so Dagens økt checkmarks + streak reflect what just happened.
    const onFocus = () => setProgress(getProgress())
    window.addEventListener('focus', onFocus)
    return () => {
      alive = false
      window.removeEventListener('focus', onFocus)
    }
  }, [loadSession])

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
        {showOnboarding && (
          <Onboarding
            onClose={() => setShowOnboarding(false)}
            onStartBrowsing={() => router.push('/bla')}
          />
        )}

        <header className="mb-8 sm:mb-10">
          <h1 className="font-display text-3xl text-[var(--color-ivory)] sm:text-4xl">Hva vil du gjøre?</h1>
          <p className="mt-2 max-w-xl text-[var(--color-muted)]">
            Velg en modus for å komme i gang. Du kan alltid bytte fra menyen øverst.
          </p>
        </header>

        <DailyCard licks={licks} progress={progress} />

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
