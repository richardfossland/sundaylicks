'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, GraduationCap, X } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { getProgress, type Progress } from '@/lib/progress'
import { computeAllCourseProgress, pickContinueCourse, resumeStep, type CourseProgress } from './course-progress'
import { CourseCard } from './CourseCard'

const SEEN_KURS_INTRO_KEY = 'sundaylicks_seen_kurs_intro'

/**
 * Kurs-modus overview — a calm, focused list of the curated learning paths
 * (`@/data/curated-paths`), each with real progress pulled from the local
 * practice log (`@/lib/progress`). Stepping into a course hands off to the
 * existing Practice view via `?path=<id>&i=<n>` — same mechanism the old
 * dashboard's course grid used, unchanged here.
 */
export default function KursPage() {
  const [progress, setProgress] = useState<Progress>({ practiced: [], bestBpm: {} })
  const [showIntro, setShowIntro] = useState(false)

  useEffect(() => {
    setProgress(getProgress())
    try {
      if (!localStorage.getItem(SEEN_KURS_INTRO_KEY)) setShowIntro(true)
    } catch {
      /* storage blocked — just skip the banner */
    }
  }, [])

  function dismissIntro() {
    setShowIntro(false)
    try {
      localStorage.setItem(SEEN_KURS_INTRO_KEY, '1')
    } catch {
      /* storage blocked — nothing to persist, banner just won't return this session */
    }
  }

  const allProgress = useMemo(() => computeAllCourseProgress(progress.practiced), [progress.practiced])
  const continueCourse = useMemo(() => pickContinueCourse(allProgress), [allProgress])

  return (
    <AppShell mode="kurs">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        {showIntro && <IntroBanner onDismiss={dismissIntro} />}

        <header className="mb-8 max-w-2xl sm:mb-10">
          <h1 className="font-display text-3xl text-[var(--color-ivory)] sm:text-4xl">Ta et kurs</h1>
          <p className="mt-2 text-[var(--color-muted)]">
            Strukturerte løp gjennom biblioteket — fra nybegynner til avansert.
          </p>
        </header>

        {continueCourse && (
          <section className="mb-8 sm:mb-10" aria-label="Fortsett der du slapp">
            <h2 className="mb-3 font-display text-lg text-[var(--color-ivory)]">Fortsett der du slapp</h2>
            <ContinueCourseCard progress={continueCourse} />
          </section>
        )}

        <section aria-label="Alle kurs">
          <h2 className="mb-3 font-display text-lg text-[var(--color-ivory)]">Alle kurs</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allProgress.map((p) => (
              <CourseCard key={p.path.id} progress={p} />
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  )
}

function ContinueCourseCard({ progress }: { progress: CourseProgress }) {
  const { path, doneCount, totalCount, pct } = progress
  const { slug, index } = resumeStep(progress)

  return (
    <Link
      href={`/lick/${slug}?path=${path.id}&i=${index}`}
      className="group flex flex-col gap-4 rounded-2xl border border-[var(--color-sea)]/30 bg-[var(--color-sea)]/8 p-5 transition-colors hover:border-[var(--color-sea)]/60 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <p className="font-display text-xl text-[var(--color-ivory)]">{path.name}</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Fortsett på steg {index + 1} av {totalCount} · {doneCount}/{totalCount} øvd
        </p>
        <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[var(--color-raised)]">
          <div className="h-full rounded-full bg-[var(--color-sea)] transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="flex shrink-0 items-center gap-1.5 self-start rounded-full bg-[var(--color-sea)] px-5 py-2.5 text-sm font-medium text-[var(--color-ink-on-sea)] transition-transform group-hover:translate-x-0.5 sm:self-auto">
        Fortsett <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  )
}

function IntroBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="animate-fade-in mb-8 flex items-start gap-3 rounded-2xl border border-[var(--color-sea)]/30 bg-[var(--color-sea)]/8 p-4 sm:p-5">
      <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-sea)]" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-base text-[var(--color-ivory)]">Hva er et kurs?</p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
          Et kurs er en ferdig sammensatt rekkefølge av licks fra biblioteket — spilt steg for steg tar
          den deg fra et tema til mestring. Du velger tempo selv underveis; kurset holder styr på hvor
          langt du er kommet.
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Lukk forklaringen"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--color-muted)] transition-colors hover:text-[var(--color-ivory)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
