'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Music, Volume2, Play, Timer, Sparkles, Download, Trash2, Info } from 'lucide-react'
import { KeySelector } from '@/components/KeySelector'
import { useSession } from '@/lib/session'
import { INSTRUMENT_ORDER, INSTRUMENT_LABEL } from '@/lib/instruments'
import {
  getReelAutoplay,
  setReelAutoplay,
  getPracticeDefaults,
  setPracticeDefaults,
} from '@/lib/prefs'
import { collectExportData } from '@/lib/export-data'
import { cn } from '@/lib/cn'

// Onboarding-overlayet drar inn Tone via audio-unlock → last det klient-only,
// og bare når brukeren faktisk ber om å se introen igjen.
const Onboarding = dynamic(() => import('@/components/onboarding/Onboarding').then((m) => m.Onboarding), {
  ssr: false,
})

/**
 * /innstillinger — én rolig side med alle enhets-preferanser samlet. Alt her er
 * rent lokalt (samme localStorage som resten av appen). Toneart + lyd skriver
 * `useSession` (delt med /spill og TransportBar); blavisning + øvings-standarder
 * skriver `lib/prefs`. Alle lesninger skjer i effekter — de prefs-baserte
 * togglene rendres deaktivert til de er hydrert, så SSR-markup og første klient-
 * paint aldri viser feil av/på-tilstand.
 */
export function SettingsView() {
  // Toneart + lyd: useSession (egen hydrering via load()).
  const instrument = useSession((s) => s.instrument)
  const setInstrument = useSession((s) => s.setInstrument)
  const loadSession = useSession((s) => s.load)

  // Prefs-baserte togglene: lokal state seedet i effekt (hydration-trygt).
  const [hydrated, setHydrated] = useState(false)
  const [autoplay, setAutoplay] = useState(true)
  const [metronome, setMetronome] = useState(false)
  const [countIn, setCountIn] = useState(false)

  const [confirmReset, setConfirmReset] = useState(false)
  const [showIntro, setShowIntro] = useState(false)

  useEffect(() => {
    loadSession()
    setAutoplay(getReelAutoplay())
    const d = getPracticeDefaults()
    setMetronome(d.metronome)
    setCountIn(d.countIn)
    setHydrated(true)
  }, [loadSession])

  const onToggleAutoplay = () => {
    setAutoplay((v) => {
      const next = !v
      setReelAutoplay(next)
      return next
    })
  }
  const onToggleMetronome = () => {
    setMetronome((v) => {
      const next = !v
      setPracticeDefaults({ metronome: next })
      return next
    })
  }
  const onToggleCountIn = () => {
    setCountIn((v) => {
      const next = !v
      setPracticeDefaults({ countIn: next })
      return next
    })
  }

  const onExport = () => {
    const bundle = collectExportData((k) => {
      try {
        return localStorage.getItem(k)
      } catch {
        return null
      }
    })
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const d = new Date()
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`
    const a = document.createElement('a')
    a.href = url
    a.download = `sundaylicks-eksport-${stamp}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // Nullstill: slett ALLE nøkler med `sundaylicks_`-prefiks i både local- og
  // sessionStorage (prefiks-konsistensen er nettopp derfor nøklene deler den),
  // så full reload til forsiden med helt fersk state.
  const onReset = () => {
    for (const storage of [localStorage, sessionStorage]) {
      try {
        const keys: string[] = []
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i)
          if (k && k.startsWith('sundaylicks_')) keys.push(k)
        }
        keys.forEach((k) => storage.removeItem(k))
      } catch {
        /* storage blocked — ignore */
      }
    }
    window.location.href = '/'
  }

  return (
    <>
      {/* Se introduksjonen igjen: åpne overlayet direkte. Ingen onStartBrowsing →
          fullføring herfra navigerer ikke, den bare lukker overlayet. Flagget
          røres ikke ved lukking (brukeren er allerede onboarded). */}
      {showIntro && <Onboarding onClose={() => setShowIntro(false)} />}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-[var(--color-ivory)] sm:text-4xl">Innstillinger</h1>
        <p className="mt-2 max-w-xl text-[var(--color-muted)]">
          Alt lagres lokalt på enheten din — ingen konto, ingen sky.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {/* Toneart */}
        <Section icon={<Music className="h-5 w-5" />} title="Toneart">
          <p className="mb-3 text-sm text-[var(--color-muted)]">
            Tonearten din styrer hvilken toneart licks åpnes transponert i, og hva forsiden fremhever.
          </p>
          <KeySelector />
        </Section>

        {/* Lyd */}
        <Section icon={<Volume2 className="h-5 w-5" />} title="Lyd">
          <p className="mb-3 text-sm text-[var(--color-muted)]">
            Instrumentet appen spiller alle licks, demoer og øvinger med.
          </p>
          <div className="flex flex-wrap gap-2">
            {INSTRUMENT_ORDER.map((kind) => (
              <button
                key={kind}
                type="button"
                aria-pressed={instrument === kind}
                onClick={() => setInstrument(kind)}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                  instrument === kind
                    ? 'border-[var(--color-amber)] bg-[var(--color-amber)] text-[var(--color-ink-on-amber)]'
                    : 'border-[var(--color-border)] bg-[var(--color-raised)] text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
                )}
              >
                {INSTRUMENT_LABEL[kind]}
              </button>
            ))}
          </div>
        </Section>

        {/* Bla-visning */}
        <Section icon={<Play className="h-5 w-5" />} title="Bla-visning">
          <ToggleRow
            label="Spill av automatisk"
            hint="Spiller licken når du lander på et kort i «Bla». Skru av for stille blaing."
            checked={autoplay}
            disabled={!hydrated}
            onToggle={onToggleAutoplay}
          />
        </Section>

        {/* Øving */}
        <Section icon={<Timer className="h-5 w-5" />} title="Øving">
          <p className="mb-3 text-sm text-[var(--color-muted)]">
            Standarder for hvordan øvingssiden starter. Du kan alltid overstyre dem for den enkelte
            økta i transport-linja — dette er bare utgangspunktet.
          </p>
          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            <ToggleRow
              label="Metronom på som standard"
              hint="Klikk på hvert slag under avspilling."
              checked={metronome}
              disabled={!hydrated}
              onToggle={onToggleMetronome}
            />
            <ToggleRow
              label="Tell inn som standard"
              hint="Én takt med klikk før avspilling starter."
              checked={countIn}
              disabled={!hydrated}
              onToggle={onToggleCountIn}
            />
          </div>
        </Section>

        {/* Introduksjon */}
        <Section icon={<Sparkles className="h-5 w-5" />} title="Introduksjon">
          <p className="mb-3 text-sm text-[var(--color-muted)]">
            Vil du se den lille introduksjonen på nytt? Den forklarer hvordan du blar, velger toneart
            og øver.
          </p>
          <button
            type="button"
            onClick={() => setShowIntro(true)}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] px-4 py-2 text-sm font-medium text-[var(--color-ivory)] transition-colors hover:border-[var(--color-amber)]"
          >
            Se introduksjonen igjen
          </button>
        </Section>

        {/* Data */}
        <Section icon={<Download className="h-5 w-5" />} title="Data">
          <p className="mb-3 text-sm text-[var(--color-muted)]">
            All fremgangen din, favoritter og lister ligger lokalt. Ta en kopi — eller start på nytt.
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onExport}
              className="flex w-fit items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] px-4 py-2 text-sm font-medium text-[var(--color-ivory)] transition-colors hover:border-[var(--color-amber)]"
            >
              <Download className="h-4 w-4" /> Eksporter dataene mine (JSON)
            </button>

            {confirmReset ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-[#C7534E]/50 bg-[#C7534E]/10 p-4">
                <p className="text-sm text-[var(--color-ivory)]">
                  Dette sletter <strong>all</strong> lokal data — fremgang, favoritter, lister og
                  innstillinger. Handlingen kan ikke angres.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onReset}
                    className="flex items-center gap-2 rounded-full bg-[#C7534E] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    <Trash2 className="h-4 w-4" /> Ja, slett alt
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-ivory)]"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="flex w-fit items-center gap-2 rounded-full border border-[#C7534E]/50 px-4 py-2 text-sm font-medium text-[#C7534E] transition-colors hover:bg-[#C7534E]/10"
              >
                <Trash2 className="h-4 w-4" /> Nullstill all lokal data
              </button>
            )}
          </div>
        </Section>

        {/* Om lyder og rettigheter */}
        <Section icon={<Info className="h-5 w-5" />} title="Om lyder og rettigheter">
          <div className="flex flex-col gap-2 text-sm text-[var(--color-muted)]">
            <p>
              <span className="text-[var(--color-ivory)]">Piano</span> — Salamander Grand-samples via
              Tone.js-CDN (CC-BY 3.0, Alexander Holm).
            </p>
            <p>
              <span className="text-[var(--color-ivory)]">Gitar</span> — akustisk gitar fra
              tonejs-instruments / University of Iowa (CC-BY 3.0), self-hostet i appen.
            </p>
            <p>
              <span className="text-[var(--color-ivory)]">Bass</span> — el-bass fra
              tonejs-instruments (bass-electric, CC-BY 3.0), self-hostet i appen.
            </p>
            <p>
              <span className="text-[var(--color-ivory)]">El-piano</span> og{' '}
              <span className="text-[var(--color-ivory)]">Pad</span> er syntetisert lokalt i appen —
              ingen samples, ingen eksterne kilder.
            </p>
            <p className="text-xs">
              Fulle kilder og lisenser: <code className="text-[var(--color-ivory)]">/samples/CREDITS.md</code>.
            </p>
          </div>
        </Section>
      </div>
    </main>
    </>
  )
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2.5 font-display text-xl text-[var(--color-ivory)]">
        <span className="text-[var(--color-amber)]">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onToggle,
}: {
  label: string
  hint: string
  checked: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-ivory)]">{label}</p>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40',
          checked ? 'bg-[var(--color-amber)]' : 'bg-[var(--color-raised)] border border-[var(--color-border)]',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white transition-all',
            checked ? 'left-[calc(100%-2px)] -translate-x-full' : 'left-0.5',
          )}
        />
      </button>
    </div>
  )
}
