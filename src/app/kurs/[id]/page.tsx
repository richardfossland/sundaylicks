'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Check, GraduationCap } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { GlossaryText } from '@/components/glossary/GlossaryText'
import { CURATED_PATHS } from '@/data/curated-paths'
import { FALLBACK_LICKS, fetchLicks } from '@/lib/licks'
import { getProgress, type Progress } from '@/lib/progress'
import { GENRE_LABEL, DIFFICULTY_LABEL } from '@/lib/labels'
import { cn } from '@/lib/cn'
import type { Lick } from '@/types/lick'
import { computeCourseProgress } from '../course-progress'

/**
 * One course's numbered path — every step, in order, with a done-check for
 * ones already practiced and the next unplayed step highlighted. Each step
 * is a plain link into the existing Practice view (`?path=<id>&i=<n>`); this
 * page only lays the steps out, it doesn't touch how a step is practiced.
 */
export default function KursDetailPage() {
  const params = useParams<{ id: string }>()
  const path = CURATED_PATHS.find((p) => p.id === params.id)

  const [licks, setLicks] = useState<Lick[]>(FALLBACK_LICKS)
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

  const lickBySlug = useMemo(() => new Map(licks.map((l) => [l.slug, l])), [licks])

  if (!path) {
    return (
      <AppShell mode="kurs">
        <main className="mx-auto max-w-xl px-4 py-20 text-center">
          <p className="text-[var(--color-muted)]">Fant ikke dette kurset.</p>
          <Link
            href="/kurs"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-sea)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Tilbake til alle kurs
          </Link>
        </main>
      </AppShell>
    )
  }

  const cp = computeCourseProgress(path, progress.practiced)

  return (
    <AppShell mode="kurs">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <Link
          href="/kurs"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ivory)]"
        >
          <ArrowLeft className="h-4 w-4" /> Alle kurs
        </Link>

        <header className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--color-sea)]/12 px-3 py-1 text-xs font-medium text-[var(--color-sea)]">
            <GraduationCap className="h-3.5 w-3.5" /> Kurs
          </div>
          <h1 className="font-display text-3xl text-[var(--color-ivory)] sm:text-4xl">{path.name}</h1>
          <GlossaryText
            text={path.description}
            className="mt-3 max-w-xl text-[var(--color-muted)] leading-relaxed"
          />

          <div className="mt-5 max-w-sm">
            <div className="mb-1 flex items-center justify-between text-xs text-[var(--color-muted)]">
              <span>
                {cp.doneCount}/{cp.totalCount} øvd
              </span>
              <span>{cp.pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-raised)]">
              <div className="h-full rounded-full bg-[var(--color-sea)] transition-[width]" style={{ width: `${cp.pct}%` }} />
            </div>
          </div>
        </header>

        <ol className="flex flex-col gap-2">
          {path.slugs.map((slug, i) => {
            const lick = lickBySlug.get(slug)
            const done = progress.practiced.includes(slug)
            const isNext = i === cp.nextIndex

            return (
              <li key={`${slug}-${i}`}>
                <Link
                  href={`/lick/${slug}?path=${path.id}&i=${i}`}
                  className={cn(
                    'flex items-center gap-4 rounded-2xl border p-4 transition-colors',
                    isNext
                      ? 'border-[var(--color-sea)]/50 bg-[var(--color-sea)]/8'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-sea)]/40',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-medium',
                      done
                        ? 'bg-[var(--color-sea)] text-[var(--color-ink-on-sea)]'
                        : 'bg-[var(--color-raised)] text-[var(--color-muted)]',
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base text-[var(--color-ivory)]">{lick?.name ?? slug}</p>
                    {lick && (
                      <p className="mt-0.5 truncate text-sm text-[var(--color-muted)]">
                        {GENRE_LABEL[lick.genre]} · {DIFFICULTY_LABEL[lick.difficulty]}
                      </p>
                    )}
                  </div>
                  {isNext && (
                    <span className="shrink-0 rounded-full bg-[var(--color-sea)]/15 px-2.5 py-1 text-xs font-medium text-[var(--color-sea)]">
                      Neste
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ol>
      </main>
    </AppShell>
  )
}
