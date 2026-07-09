'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flame, Circle, CircleCheck, ArrowRight } from 'lucide-react'
import type { Lick } from '@/types/lick'
import { todayKey, type Progress } from '@/lib/progress'
import {
  computeStreak,
  getOrCreateDailySession,
  loadDaily,
  recordDailyCompletion,
  type DailyPick,
  type DailyRole,
} from '@/lib/daily'

const ROLE_LABEL: Record<DailyRole, string> = {
  repetisjon: 'Repetisjon',
  ny: 'Ny',
  strekk: 'Strekk',
}

/**
 * "Dagens økt" — a fixed 4-lick set for today plus a streak flame, shown at the
 * top of the launcher. Renders nothing until mounted so the server markup and
 * the first client render match (all localStorage/Date reads happen in an
 * effect). Session membership + roles are frozen for the day; only the
 * done-checkmarks and the streak update as the player practices.
 */
export function DailyCard({ licks, progress }: { licks: Lick[]; progress: Progress }) {
  const [mounted, setMounted] = useState(false)
  const [today, setToday] = useState('')
  const [picks, setPicks] = useState<DailyPick[]>([])
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    const key = todayKey()
    const session = getOrCreateDailySession(key, licks, progress)
    recordDailyCompletion(key, progress)
    setToday(key)
    setPicks(session)
    setStreak(computeStreak(loadDaily().completedDates, key))
    setMounted(true)
  }, [licks, progress])

  if (!mounted || picks.length === 0) return null

  const nameBySlug = new Map(licks.map((l) => [l.slug, l.name]))
  const isDone = (slug: string) => progress.lastPracticed?.[slug] === today
  const firstUndone = picks.findIndex((p) => !isDone(p.slug))
  const allDone = firstUndone === -1

  return (
    <section className="mb-8 sm:mb-10" aria-label="Dagens økt">
      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg text-[var(--color-ivory)] sm:text-xl">Dagens økt</h2>
          {streak > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-[var(--color-amber)]/40 bg-[var(--color-amber)]/10 px-3 py-1 text-sm font-medium text-[var(--color-amber)]">
              <Flame className="h-4 w-4" /> {streak} {streak === 1 ? 'dag' : 'dager'}
            </span>
          )}
        </div>

        <ul className="mt-4 flex flex-col gap-1">
          {picks.map((p, i) => {
            const done = isDone(p.slug)
            return (
              <li key={p.slug}>
                <Link
                  href={`/lick/${p.slug}?daily=1&i=${i}`}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[var(--color-raised)]"
                >
                  {done ? (
                    <CircleCheck className="h-5 w-5 shrink-0 text-[var(--color-sea)]" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-[var(--color-muted)]" />
                  )}
                  <span
                    className={
                      done
                        ? 'min-w-0 flex-1 truncate text-[var(--color-muted)]'
                        : 'min-w-0 flex-1 truncate text-[var(--color-ivory)]'
                    }
                  >
                    {nameBySlug.get(p.slug) ?? p.slug}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--color-muted)]">{ROLE_LABEL[p.role]}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        {allDone ? (
          <div className="mt-4 border-t border-[var(--color-border)] pt-4">
            <p className="font-display text-base text-[var(--color-ivory)]">Økten er fullført 🎉</p>
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">
              {streak > 0
                ? `Du har øvd ${streak} ${streak === 1 ? 'dag' : 'dager'} på rad. Kom tilbake i morgen for en ny økt.`
                : 'Kom tilbake i morgen for en ny økt.'}
            </p>
          </div>
        ) : (
          <Link
            href={`/lick/${picks[firstUndone].slug}?daily=1&i=${firstUndone}`}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-amber)] px-5 py-2.5 text-sm font-medium text-[var(--color-ink-on-amber)] transition-opacity hover:opacity-90"
          >
            Start økten <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </section>
  )
}
