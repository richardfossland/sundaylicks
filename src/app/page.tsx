'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Waypoints, Sparkles, GraduationCap } from 'lucide-react'
import type { Lick, Category } from '@/types/lick'
import { FALLBACK_LICKS, fetchLicks } from '@/lib/licks'
import { getProgress, type Progress } from '@/lib/progress'
import { useCollections } from '@/lib/collections'
import { useSession } from '@/lib/session'
import { CURATED_PATHS } from '@/data/curated-paths'
import { LickCard } from '@/components/LickCard'
import { PathCard } from '@/components/PathCard'
import { KeySelector } from '@/components/KeySelector'
import { KEY_NAMES } from '@/lib/music'

const SECTION_SIZE = 4

/**
 * The dashboard — "din toneart" front and centre. Every section below reads
 * from the same global key (useSession) and asks each LickCard to open the
 * lick already transposed there.
 */
export default function DashboardPage() {
  const [licks, setLicks] = useState<Lick[]>(FALLBACK_LICKS)
  const [progress, setProgress] = useState<Progress>({ practiced: [], bestBpm: {} })

  const loadCollections = useCollections((s) => s.load)
  const sessionKey = useSession((s) => s.key)
  const loadSession = useSession((s) => s.load)

  useEffect(() => {
    let alive = true
    fetchLicks().then((rows) => {
      if (alive) setLicks(rows)
    })
    setProgress(getProgress())
    loadCollections()
    loadSession()
    return () => {
      alive = false
    }
  }, [loadCollections, loadSession])

  const root = sessionKey.root
  const keyLabel = `${KEY_NAMES[root]}${sessionKey.mode === 'minor' ? '-moll' : '-dur'}`

  const byCategory = useMemo(() => {
    const map = new Map<Category, Lick[]>()
    for (const l of licks) {
      const arr = map.get(l.category) ?? []
      arr.push(l)
      map.set(l.category, arr)
    }
    return map
  }, [licks])

  const introEnding = useMemo(
    () => [...(byCategory.get('intro') ?? []).slice(0, 2), ...(byCategory.get('ending') ?? []).slice(0, 2)],
    [byCategory],
  )

  const sections: { title: string; items: Lick[]; seeAllHref: string }[] = [
    {
      title: `Turnarounds i ${keyLabel}`,
      items: (byCategory.get('turnaround') ?? []).slice(0, SECTION_SIZE),
      seeAllHref: '/utforsk?category=turnaround',
    },
    {
      title: `2-5-1 i ${keyLabel}`,
      items: (byCategory.get('two-five-one') ?? []).slice(0, SECTION_SIZE),
      seeAllHref: '/utforsk?category=two-five-one',
    },
    {
      title: `Fills i ${keyLabel}`,
      items: (byCategory.get('fill') ?? []).slice(0, SECTION_SIZE),
      seeAllHref: '/utforsk?category=fill',
    },
    {
      title: `Intro & avslutning i ${keyLabel}`,
      items: introEnding,
      seeAllHref: '/utforsk',
    },
  ]

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="font-display text-4xl text-[var(--color-ivory)] sm:text-5xl">Dashbord</h1>
        <p className="mt-2 max-w-xl text-[var(--color-muted)]">
          Velg toneart, og biblioteket møter deg der — turnarounds, 2-5-1-er, fills og intro/avslutning,
          transponert og klar til å øve.
        </p>
      </header>

      {/* Din toneart — the dashboard's primary control, mirrored (compact) in the header. */}
      <section className="mb-10 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
        <h2 className="mb-3 font-display text-xl text-[var(--color-ivory)]">Din toneart</h2>
        <KeySelector />
      </section>

      {sections.map((s) => (
        <LickSection key={s.title} title={s.title} items={s.items} targetKey={root} seeAllHref={s.seeAllHref} progress={progress} />
      ))}

      {/* Courses */}
      {CURATED_PATHS.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-[var(--color-amber)]" />
            <h2 className="font-display text-2xl text-[var(--color-ivory)]">Kurs</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CURATED_PATHS.map((p) => (
              <PathCard key={p.id} path={p} practiced={progress.practiced} />
            ))}
          </div>
        </section>
      )}

      {/* Entries to the other GUI flows. */}
      <section className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PromoCard
          href="/transitions"
          icon={<Waypoints className="h-5 w-5" />}
          title="Overganger"
          description="Kvintsirkelen som kart — finn en naturlig vei fra én toneart til en annen."
        />
        <PromoCard
          href="/spice"
          icon={<Sparkles className="h-5 w-5" />}
          title="Spice up"
          description="Krydre en enkel progresjon med gjennomgangsakkorder og reharmonisering."
        />
      </section>
    </main>
  )
}

function LickSection({
  title,
  items,
  targetKey,
  seeAllHref,
  progress,
}: {
  title: string
  items: Lick[]
  targetKey: number
  seeAllHref: string
  progress: Progress
}) {
  if (items.length === 0) return null
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-[var(--color-ivory)]">{title}</h2>
        <Link
          href={seeAllHref}
          className="flex shrink-0 items-center gap-0.5 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-amber)]"
        >
          Se alle <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((l) => (
          <LickCard
            key={l.slug}
            lick={l}
            targetKey={targetKey}
            practiced={progress.practiced.includes(l.slug)}
            bestBpm={progress.bestBpm[l.slug]}
          />
        ))}
      </div>
    </section>
  )
}

function PromoCard({
  href,
  icon,
  title,
  description,
  soon,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  soon?: boolean
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-amber)]/60"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-amber)]/10 text-[var(--color-amber)]">
          {icon}
        </span>
        {soon && (
          <span className="rounded-full bg-[var(--color-sea)]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-sea)]">
            Kommer snart
          </span>
        )}
      </div>
      <h3 className="font-display text-lg text-[var(--color-ivory)]">{title}</h3>
      <p className="text-sm leading-relaxed text-[var(--color-muted)]">{description}</p>
      <span className="mt-auto flex items-center gap-0.5 pt-1 text-sm text-[var(--color-amber)] opacity-80 transition-opacity group-hover:opacity-100">
        Utforsk <ChevronRight className="h-4 w-4" />
      </span>
    </Link>
  )
}
