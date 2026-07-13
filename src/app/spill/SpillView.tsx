'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Wand2 } from 'lucide-react'
import { useSession } from '@/lib/session'
import { KeySelector } from '@/components/KeySelector'
import { KEY_NAMES } from '@/lib/music'
import { ACCENT_CLASSES } from '@/lib/modes'
import { cn } from '@/lib/cn'
import { Term } from '@/components/glossary/Term'
import { KrydreTab } from './KrydreTab'
import { OverTab } from './OverTab'
import { SkalaTab } from './SkalaTab'

type Fane = 'krydre' | 'overganger' | 'skalaer'

function isFane(v: string | null): v is Fane {
  return v === 'krydre' || v === 'overganger' || v === 'skalaer'
}

const TABS: { key: Fane; label: string }[] = [
  { key: 'krydre', label: 'Krydre' },
  { key: 'overganger', label: 'Overganger' },
  { key: 'skalaer', label: 'Skalaer' },
]

const ember = ACCENT_CLASSES.ember

/**
 * "Spill smartere" — the merged krydre/overganger mode. This is the PRIMARY
 * <KeySelector> home (see AppShell.tsx's contract comment); /innstillinger (U2)
 * mounts a second one for adjusting toneart outside a mode — both write the same
 * `useSession` key. Owns a `?fane=`-backed tab switch between its flows.
 */
export function SpillView() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [fane, setFane] = useState<Fane>(() => {
    const initial = searchParams.get('fane')
    return isFane(initial) ? initial : 'krydre'
  })

  const sessionKey = useSession((s) => s.key)
  const loadSession = useSession((s) => s.load)

  useEffect(() => {
    loadSession()
  }, [loadSession])

  const changeFane = (f: Fane) => {
    setFane(f)
    router.replace(`/spill?fane=${f}`, { scroll: false })
  }

  const keyLabel = `${KEY_NAMES[sessionKey.root]}${sessionKey.mode === 'minor' ? '-moll' : '-dur'}`

  return (
    // A plain <div>, not <main> — both tabs can embed the Practice player
    // inline for a preview, and Practice renders its own <main>. A page must
    // not nest two <main> landmarks (same reasoning as the old /spice page).
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <header className="mb-6">
        <div className={cn('mb-2 flex items-center gap-2', ember.text)}>
          <Wand2 className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wide">Spill smartere</span>
        </div>
        <h1 className="font-display text-3xl text-[var(--color-ivory)] sm:text-4xl">
          Overganger, krydder og skalaer — for det du spiller
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--color-muted)]">
          Velg <Term id="toneart">toneart</Term> under — den styrer overgangene, krydder-forslagene og
          skalaene i {keyLabel}.
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
        <h2 className="mb-3 font-display text-xl text-[var(--color-ivory)]">Din toneart</h2>
        <KeySelector />
      </section>

      <div
        role="tablist"
        aria-label="Spill smartere-flater"
        className="mb-8 flex gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] p-1 text-sm"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={fane === t.key}
            onClick={() => changeFane(t.key)}
            className={cn(
              'flex-1 rounded-full px-4 py-2 font-medium transition-colors',
              fane === t.key ? cn(ember.bg, ember.ink) : 'text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {fane === 'krydre' ? <KrydreTab /> : fane === 'overganger' ? <OverTab /> : <SkalaTab />}
      </div>
    </div>
  )
}
