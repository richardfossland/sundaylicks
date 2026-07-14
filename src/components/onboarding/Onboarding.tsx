'use client'

// Den interaktive onboardingen — et fullskjerms overlay (fixed inset-0 z-50, over
// topbar z-30 og meny z-40) som tar en helt fersk bruker gjennom seks steg: hva
// appen er, hør en ekte lick, velg toneart + lyd, bla og øv (ekte vent-modus-
// demo), finn frem, og klar. Vises kun én gang (se lib/onboarding.ts-porten) og
// gjenfinnes under Innstillinger.
//
// Tone-isolasjon: de to lyd-stegene (2 «Hør en lick» og 4 «Bla og øv») bor i
// OnboardingSteps, som lastes `dynamic({ ssr:false })` slik at Tone/AudioContext
// aldri når server-render — samme mønster som GlossaryBrowser → DemoBlock.
//
// Fokus/tastatur: initial fokus legges på hvert stegs overskrift (full fokus-
// felle er bevisst utelatt i v1); Escape = hopp over. body-scroll låses mens
// overlayet er oppe. installAudioUnlock kalles på mount så første tap uansett
// låser opp Web Audio på iOS.

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Flame,
  GraduationCap,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react'
import { KeySelector } from '@/components/KeySelector'
import { useSession } from '@/lib/session'
import { INSTRUMENT_ORDER, INSTRUMENT_LABEL } from '@/lib/instruments'
import { installAudioUnlock } from '@/lib/audio-unlock'
import { setOnboarded } from '@/lib/onboarding'
import { ACCENT_CLASSES, type Accent } from '@/lib/modes'
import { cn } from '@/lib/cn'

const STEP_COUNT = 6

// De to Tone-nære stegene lastes klient-only; `loading` gir en rolig plassholder
// mens lyd-bunten hentes (kun første gang — chunken caches etterpå).
const OnboardingSteps = dynamic(() => import('./OnboardingSteps'), {
  ssr: false,
  loading: () => (
    <div className="h-40 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-raised)]" />
  ),
})

interface Props {
  /** Lukk overlayet (skjul). Kalles ved fullføring, hopp over og Escape. */
  onClose: () => void
  /**
   * Valgfri: hva «Start å bla»-CTA-en på siste steg gjør i stedet for å bare
   * lukke. Forsiden sender `() => router.push('/bla')`; innstillinger utelater
   * den, så fullføring derfra IKKE navigerer (den bare lukker overlayet).
   */
  onStartBrowsing?: () => void
}

export function Onboarding({ onClose, onStartBrowsing }: Props) {
  const [step, setStep] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const instrument = useSession((s) => s.instrument)
  const setInstrument = useSession((s) => s.setInstrument)

  // Fullført ELLER hoppet → marker onboarded og lukk.
  const finish = useCallback(() => {
    setOnboarded()
    onClose()
  }, [onClose])

  // Lås opp lyd + lås body-scroll så lenge overlayet er oppe.
  useEffect(() => {
    installAudioUnlock()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Escape = hopp over (samme som «Hopp over»-knappen).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finish])

  // Flytt fokus til overskriften ved hvert stegbytte (initial fokus).
  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  const next = () => setStep((s) => Math.min(s + 1, STEP_COUNT - 1))
  const back = () => setStep((s) => Math.max(s - 1, 0))
  const isLast = step === STEP_COUNT - 1

  const startBrowsing = () => {
    setOnboarded()
    if (onStartBrowsing) onStartBrowsing()
    else onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Introduksjon til SundayLicks"
      className="fixed inset-0 z-50 flex flex-col bg-[var(--color-scene)]"
    >
      {/* Topplinje: «Hopp over» alltid synlig. */}
      <div className="flex shrink-0 items-center justify-end px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={finish}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-ivory)]"
        >
          Hopp over <X className="h-4 w-4" />
        </button>
      </div>

      {/* Innhold (scroller ved behov). key={step} gir ny fade-in per steg. */}
      <div className="flex-1 overflow-y-auto">
        <div key={step} className="animate-fade-in mx-auto flex max-w-xl flex-col px-6 py-4 sm:py-8">
          <StepBody
            step={step}
            headingRef={headingRef}
            instrument={instrument}
            setInstrument={setInstrument}
            onStartBrowsing={startBrowsing}
            onStay={finish}
          />
        </div>
      </div>

      {/* Bunnlinje: progress-prikker + Tilbake/Neste. */}
      <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-scene)] px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        <div className="mx-auto flex max-w-xl flex-col gap-4">
          <div className="flex items-center justify-center gap-2" aria-hidden>
            {Array.from({ length: STEP_COUNT }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === step ? 'w-6 bg-[var(--color-amber)]' : 'w-1.5',
                  i < step ? 'bg-[var(--color-amber)]/50' : i > step ? 'bg-[var(--color-raised)]' : '',
                )}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            {step > 0 ? (
              <button
                type="button"
                onClick={back}
                className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] px-4 py-2.5 text-sm font-medium text-[var(--color-ivory)] transition-colors hover:border-[var(--color-amber)]"
              >
                <ArrowLeft className="h-4 w-4" /> Tilbake
              </button>
            ) : (
              <span aria-hidden />
            )}

            {!isLast && (
              <button
                type="button"
                onClick={next}
                className="flex items-center gap-1.5 rounded-full bg-[var(--color-amber)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink-on-amber)] transition-transform hover:translate-x-0.5"
              >
                Neste <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Stegene ────────────────────────────────────────────────────────────────────

function StepBody({
  step,
  headingRef,
  instrument,
  setInstrument,
  onStartBrowsing,
  onStay,
}: {
  step: number
  headingRef: React.RefObject<HTMLHeadingElement | null>
  instrument: ReturnType<typeof useSession.getState>['instrument']
  setInstrument: ReturnType<typeof useSession.getState>['setInstrument']
  onStartBrowsing: () => void
  onStay: () => void
}) {
  switch (step) {
    case 0:
      return (
        <>
          <StepIcon accent="amber">
            <Sparkles className="h-7 w-7" strokeWidth={1.75} />
          </StepIcon>
          <StepHeading headingRef={headingRef}>Velkommen til SundayLicks</StepHeading>
          <StepLede>
            Et lite øvingsbibliotek for gospel-, lovsangs- og jazz-piano — og gitar og bass — små, konkrete grep og
            fraser du kan lære inn og gjøre til dine egne.
          </StepLede>
          <p className="mt-4 text-[var(--color-muted)]">
            Alt du gjør lagres lokalt på denne enheten. Ingen konto, ingen sky, helt gratis. La oss
            ta en rask runde på et halvt minutt — trykk deg videre.
          </p>
        </>
      )
    case 1:
      return (
        <>
          <StepIcon accent="amber">
            <Sparkles className="h-7 w-7" strokeWidth={1.75} />
          </StepIcon>
          <StepHeading headingRef={headingRef}>Hør en lick</StepHeading>
          <StepLede>
            Dette er kjernen: en «lick» er en kort musikalsk idé. Trykk på play for å høre en liten
            gospel-frase — eller tapp enkelttangenter for å høre hver tone.
          </StepLede>
          <div className="mt-6">
            <OnboardingSteps kind="lick" />
          </div>
        </>
      )
    case 2:
      return (
        <>
          <StepIcon accent="amber">
            <Sparkles className="h-7 w-7" strokeWidth={1.75} />
          </StepIcon>
          <StepHeading headingRef={headingRef}>Velg toneart og lyd</StepHeading>
          <StepLede>
            Sett din toneart, så åpnes hver lick transponert dit. Velg også lyden appen spiller med.
            Du kan endre begge når som helst — også fra Innstillinger.
          </StepLede>

          <div className="mt-6 flex flex-col gap-5">
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--color-ivory)]">Din toneart</p>
              <KeySelector />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--color-ivory)]">Lyd</p>
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
            </div>
          </div>
        </>
      )
    case 3:
      return (
        <>
          <StepIcon accent="amber">
            <Flame className="h-7 w-7" strokeWidth={1.75} />
          </StepIcon>
          <StepHeading headingRef={headingRef}>Bla og øv</StepHeading>
          <StepLede>
            «Bla» viser hele biblioteket som en feed — dra deg gjennom det som en reels-strøm, og
            stopp der noe fenger. Vil du lære en lick inn, går du i øvemodus.
          </StepLede>
          <p className="mt-4 text-[var(--color-muted)]">
            I vent-modus venter appen på deg: den lyser opp neste tone og går ikke videre før du
            spiller den. Prøv det her — tapp tangenten som lyser, tre ganger.
          </p>
          <div className="mt-6">
            <OnboardingSteps kind="wait" />
          </div>
        </>
      )
    case 4:
      return (
        <>
          <StepIcon accent="sea">
            <GraduationCap className="h-7 w-7" strokeWidth={1.75} />
          </StepIcon>
          <StepHeading headingRef={headingRef}>Finn frem</StepHeading>
          <StepLede>
            Alt henger sammen fra forsiden og menyen øverst. Her er de fire stedene du vil bruke mest:
          </StepLede>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MiniCard
              accent="amber"
              icon={<Flame className="h-5 w-5" />}
              title="Dagens økt"
              body="En kort, ferdig plukket øvingsrunde hver dag — hold streaken i gang."
            />
            <MiniCard
              accent="sea"
              icon={<GraduationCap className="h-5 w-5" />}
              title="Kurs"
              body="Strukturerte løp gjennom biblioteket, fra nybegynner til avansert."
            />
            <MiniCard
              accent="ember"
              icon={<Wand2 className="h-5 w-5" />}
              title="Spill smartere"
              body="Overganger mellom tonearter og måter å krydre en progresjon på."
            />
            <MiniCard
              accent="sea"
              icon={<BookOpen className="h-5 w-5" />}
              title="Oppslagsverk"
              body="Fagordene forklart på norsk — de fleste med en demo du kan høre."
            />
          </div>
        </>
      )
    case 5:
      return (
        <>
          <StepIcon accent="amber">
            <Sparkles className="h-7 w-7" strokeWidth={1.75} />
          </StepIcon>
          <StepHeading headingRef={headingRef}>Klar!</StepHeading>
          <StepLede>
            Det var alt du trenger for å komme i gang. Vil du se denne introduksjonen igjen, finner du
            den under Innstillinger.
          </StepLede>
          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={onStartBrowsing}
              className="flex items-center justify-center gap-2 rounded-full bg-[var(--color-amber)] px-6 py-3.5 text-base font-semibold text-[var(--color-ink-on-amber)] transition-transform hover:translate-x-0.5"
            >
              Start å bla <ArrowRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onStay}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] px-6 py-3 text-sm font-medium text-[var(--color-ivory)] transition-colors hover:border-[var(--color-amber)]"
            >
              Bli her på forsiden
            </button>
          </div>
        </>
      )
    default:
      return null
  }
}

// ── Delte små byggeklosser ──────────────────────────────────────────────────────

function StepIcon({ accent, children }: { accent: Accent; children: React.ReactNode }) {
  const a = ACCENT_CLASSES[accent]
  return (
    <span className={cn('mb-5 grid h-14 w-14 shrink-0 place-items-center rounded-2xl', a.softBg, a.softText)}>
      {children}
    </span>
  )
}

function StepHeading({
  headingRef,
  children,
}: {
  headingRef: React.Ref<HTMLHeadingElement>
  children: React.ReactNode
}) {
  return (
    <h2
      ref={headingRef}
      tabIndex={-1}
      className="font-display text-3xl leading-tight text-[var(--color-ivory)] outline-none sm:text-4xl"
    >
      {children}
    </h2>
  )
}

function StepLede({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-lg leading-relaxed text-[var(--color-muted)]">{children}</p>
}

function MiniCard({
  accent,
  icon,
  title,
  body,
}: {
  accent: Accent
  icon: React.ReactNode
  title: string
  body: string
}) {
  const a = ACCENT_CLASSES[accent]
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <span className={cn('grid h-9 w-9 place-items-center rounded-xl', a.softBg, a.softText)}>{icon}</span>
      <p className="font-display text-base text-[var(--color-ivory)]">{title}</p>
      <p className="text-sm leading-relaxed text-[var(--color-muted)]">{body}</p>
    </div>
  )
}
