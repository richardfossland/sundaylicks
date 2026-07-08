'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Heart, ListMusic } from 'lucide-react'
import type { Lick, Genre, Difficulty } from '@/types/lick'
import { FALLBACK_LICKS, fetchLicks } from '@/lib/licks'
import { getProgress, type Progress } from '@/lib/progress'
import { useCollections } from '@/lib/collections'
import { GENRE_LABEL, GENRE_ORDER, DIFFICULTY_LABEL } from '@/lib/labels'
import { AppShell } from '@/components/AppShell'

export default function StatsPage() {
  const [licks, setLicks] = useState<Lick[]>(FALLBACK_LICKS)
  const [progress, setProgress] = useState<Progress>({ practiced: [], bestBpm: {} })
  const favorites = useCollections((s) => s.favorites)
  const lists = useCollections((s) => s.lists)
  const load = useCollections((s) => s.load)

  useEffect(() => {
    let alive = true
    fetchLicks().then((r) => alive && setLicks(r))
    setProgress(getProgress())
    load()
    return () => {
      alive = false
    }
  }, [load])

  const stats = useMemo(() => {
    const practiced = new Set(progress.practiced)
    const byGenre = GENRE_ORDER.map((g) => {
      const inG = licks.filter((l) => l.genre === g)
      return { g, total: inG.length, done: inG.filter((l) => practiced.has(l.slug)).length }
    }).filter((x) => x.total > 0)
    const byDiff = ([1, 2, 3] as Difficulty[]).map((d) => {
      const inD = licks.filter((l) => l.difficulty === d)
      return { d, total: inD.length, done: inD.filter((l) => practiced.has(l.slug)).length }
    })
    const byName = new Map(licks.map((l) => [l.slug, l.name]))
    const bestBpms = Object.entries(progress.bestBpm)
      .map(([slug, bpm]) => ({ slug, bpm, name: byName.get(slug) ?? slug }))
      .sort((a, b) => b.bpm - a.bpm)
      .slice(0, 8)
    return {
      practicedCount: licks.filter((l) => practiced.has(l.slug)).length,
      total: licks.length,
      byGenre,
      byDiff,
      bestBpms,
    }
  }, [licks, progress])

  const pct = stats.total ? Math.round((stats.practicedCount / stats.total) * 100) : 0

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ivory)]">
          <ArrowLeft className="h-4 w-4" /> Tilbake
        </Link>
        <h1 className="font-display text-4xl text-[var(--color-ivory)]">Din fremgang</h1>
        <p className="mt-2 text-[var(--color-muted)]">Lagret lokalt på denne enheten.</p>

        {/* Overall + collections */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat big label="Øvd" value={`${stats.practicedCount}/${stats.total}`} sub={`${pct}%`} />
          <Stat label="Favoritter" value={String(favorites.length)} icon={<Heart className="h-4 w-4" />} />
          <Stat label="Lister" value={String(lists.length)} icon={<ListMusic className="h-4 w-4" />} />
        </div>

        {/* Genre coverage */}
        <Section title="Dekning per sjanger">
          <div className="flex flex-col gap-2.5">
            {stats.byGenre.map(({ g, total, done }) => (
              <Bar key={g} label={GENRE_LABEL[g as Genre]} done={done} total={total} />
            ))}
          </div>
        </Section>

        {/* Difficulty */}
        <Section title="Per nivå">
          <div className="flex flex-col gap-2.5">
            {stats.byDiff.map(({ d, total, done }) => (
              <Bar key={d} label={DIFFICULTY_LABEL[d]} done={done} total={total} />
            ))}
          </div>
        </Section>

        {/* Best BPM */}
        <Section title="Beste tempo">
          {stats.bestBpms.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Øv en lick for å registrere ditt beste tempo.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {stats.bestBpms.map((b) => (
                <Link
                  key={b.slug}
                  href={`/lick/${b.slug}`}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm hover:border-[var(--color-amber)]/50"
                >
                  <span className="truncate text-[var(--color-ivory)]">{b.name}</span>
                  <span className="shrink-0 font-display text-[var(--color-sea)]">{b.bpm} BPM</span>
                </Link>
              ))}
            </div>
          )}
        </Section>
      </main>
    </AppShell>
  )
}

function Stat({
  label,
  value,
  sub,
  icon,
  big,
}: {
  label: string
  value: string
  sub?: string
  icon?: React.ReactNode
  big?: boolean
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
        {icon} {label}
      </div>
      <div className={big ? 'mt-1 font-display text-3xl text-[var(--color-amber)]' : 'mt-1 font-display text-3xl text-[var(--color-ivory)]'}>
        {value}
      </div>
      {sub && <div className="text-sm text-[var(--color-muted)]">{sub}</div>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-2xl text-[var(--color-ivory)]">{title}</h2>
      {children}
    </section>
  )
}

function Bar({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-sm text-[var(--color-muted)]">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-raised)]">
        <div className="h-full rounded-full bg-[var(--color-sea)]" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 shrink-0 text-right text-sm tabular-nums text-[var(--color-muted)]">
        {done}/{total}
      </span>
    </div>
  )
}
