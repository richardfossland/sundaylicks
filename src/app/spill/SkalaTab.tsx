'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { BookOpen, Loader2, Play, Square } from 'lucide-react'
import type { Lick } from '@/types/lick'
import { useSession } from '@/lib/session'
import { getEngine } from '@/lib/playback'
import { usePlayer } from '@/lib/store'
import { installAudioUnlock } from '@/lib/audio-unlock'
import { generatedToLick } from '@/lib/spice'
import { diatonicChords } from '@/lib/theory/keys'
import {
  SCALES,
  SCALE_BY_ID,
  SCALE_GROUP_LABEL,
  SCALE_GROUP_ORDER,
  scalePitches,
  scalesForChord,
  type ScaleDef,
} from '@/lib/theory/scales'
import {
  SCALE_PATTERN_LABEL,
  scaleOverChordLick,
  scalePracticeLick,
  type ScalePattern,
} from '@/lib/theory/scale-licks'
import { MiniKeyboard } from '@/components/glossary/MiniKeyboard'
import { SpiceChordPicker, type ChordChoice } from '@/components/SpiceChordPicker'
import { Term } from '@/components/glossary/Term'
import { KEY_NAMES, chordLabel, pitchClass } from '@/lib/music'
import { ACCENT_CLASSES } from '@/lib/modes'
import { loadViewState, saveViewState } from '@/lib/view-state'
import { cn } from '@/lib/cn'

/** sessionStorage key for this tab's browse state (see lib/view-state.ts). */
const VIEW_KEY = 'sundaylicks_view_skala'

interface SkalaViewState {
  scaleId: string
  chordChoice: ChordChoice
}

/** Validate a chord pick down to {root 0–11, quality, roman?}, or null. */
function asChord(v: unknown): ChordChoice | null {
  if (typeof v !== 'object' || v === null) return null
  const c = v as Record<string, unknown>
  if (typeof c.root !== 'number' || !Number.isInteger(c.root) || c.root < 0 || c.root > 11) return null
  if (typeof c.quality !== 'string') return null
  if (c.roman !== undefined && typeof c.roman !== 'string') return null
  return { root: c.root, quality: c.quality, ...(typeof c.roman === 'string' ? { roman: c.roman } : {}) }
}

/** Reject a stored blob whose scaleId no longer exists or chord is malformed. */
function validateSkalaState(d: Record<string, unknown>): SkalaViewState | null {
  const { scaleId, chordChoice } = d
  if (typeof scaleId !== 'string' || !SCALE_BY_ID.has(scaleId)) return null
  const chord = asChord(chordChoice)
  if (!chord) return null
  return { scaleId, chordChoice: chord }
}

// Tone.js touches the AudioContext — must never run during SSR / the Cloudflare
// Worker render, same as KrydreTab/OverTab.
const Practice = dynamic(() => import('@/components/Practice').then((m) => m.Practice), {
  ssr: false,
  loading: () => <p className="py-10 text-center text-[var(--color-muted)]">Laster spilleren …</p>,
})

const ember = ACCENT_CLASSES.ember

const PATTERNS: ScalePattern[] = ['opp-ned', 'terser', 'grupper4']
const PATTERN_TITLE: Record<ScalePattern, string> = {
  'opp-ned': 'Rett opp/ned',
  terser: 'I terser',
  grupper4: 'Grupper på 4',
}

/**
 * "Skalaer" — den tredje fanen i /spill. To øvingsformer bundet sammen av
 * toneartvelgeren (arvet fra SpillView): (1) velg en skala, se den på tangentene,
 * hør den og øv den i tre mønstre; (2) VIKTIGST — velg en akkord og få rangerte
 * skala-forslag du kan høre spilt over akkorden og øve på.
 *
 * Motoren er appens ene globale singleton, så «Hør»-knappene følger samme
 * stop-før-play-kontrakt som reels/glossary: bare én ting lyder om gangen, og
 * `Practice`-preview-panelet nederst stopper den før det tar over.
 */
export function SkalaTab() {
  const sessionKey = useSession((s) => s.key)

  const [scaleId, setScaleId] = useState<string>('dur')
  const scale = SCALE_BY_ID.get(scaleId) ?? SCALES[0]

  const [chordChoice, setChordChoice] = useState<ChordChoice>({ root: sessionKey.root, quality: 'maj7' })
  const [preview, setPreview] = useState<Lick | null>(null)
  // Hvilken engangs-avspilling som «eier» knappe-spinneren akkurat nå.
  const [playingId, setPlayingId] = useState<string | null>(null)

  const isLoading = usePlayer((s) => s.isLoading)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const previewRef = useRef<HTMLDivElement>(null)
  // Gates lagre-effekten til restore har kjørt.
  const hydratedRef = useRef(false)
  // Settes når restore ga en akkord OG en session-hydrering fortsatt kommer —
  // følg-effekten absorberer da den ene endringen uten å overstyre restore.
  const pinnedChordRef = useRef(false)

  const rootPc = sessionKey.root

  // Installer iOS/gesture-unlock én gang — fanen spiller lyd.
  useEffect(() => {
    installAudioUnlock()
  }, [])

  // Følg toneart: la akkordvelgeren lande på tonika når «din toneart» endres.
  // Gated på hydratedRef så en gjenopprettet akkord overlever den asynkrone
  // session-hydreringen; pinnedChordRef svelger den ene hydrerings-endringen.
  useEffect(() => {
    if (!hydratedRef.current) return
    if (pinnedChordRef.current) {
      pinnedChordRef.current = false
      return
    }
    const tonic = diatonicChords(sessionKey)[0]
    setChordChoice({ root: tonic.root, quality: tonic.quality, roman: tonic.roman })
  }, [sessionKey])

  // Gjenopprett fanens browse-tilstand (valgt skala + akkord) fra forrige
  // øving-tur, så et fanebytte eller retur fra spilleren ikke nullstiller den.
  // Kjører én gang ved mount. NB: `preview`/`playingId` lagres ALDRI (G2).
  useEffect(() => {
    const saved = loadViewState(VIEW_KEY, validateSkalaState)
    if (saved) {
      setScaleId(saved.scaleId)
      setChordChoice(saved.chordChoice)
      // Pin kun når en hydrerings-endring fortsatt kommer.
      if (!useSession.getState().hydrated) pinnedChordRef.current = true
    }
    hydratedRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Lagre ved hver endring når hydrert (re-stempler TTL). Aldri preview/playingId.
  useEffect(() => {
    if (!hydratedRef.current) return
    saveViewState(VIEW_KEY, { scaleId, chordChoice })
  }, [scaleId, chordChoice])

  // Nullstill knappe-spinneren når motoren slutter å spille (engangs-lyder).
  useEffect(() => {
    if (!isPlaying) setPlayingId(null)
  }, [isPlaying])

  // Stopp motoren ved unmount (fanebytte) — preview-Practice rydder sin egen.
  useEffect(() => {
    return () => getEngine().stop()
  }, [])

  const diatonic = useMemo(() => diatonicChords(sessionKey, { harmonic: true }), [sessionKey])
  const fits = useMemo(() => scalesForChord(chordChoice.quality), [chordChoice.quality])

  // Skalaen på tangentene: 2 oktaver, grunntonen amber, skalatonene sea.
  const keyPitches = useMemo(() => scalePitches(rootPc, scale, 2, 60), [rootPc, scale])

  /** Engangs-avspilling av en generert lick (useReelPlayer-idiomet). */
  const hear = (id: string, lick: Lick) => {
    const engine = getEngine()
    engine.stop()
    if (playingId === id && isPlaying) {
      setPlayingId(null)
      return
    }
    engine.build(lick, { targetKey: lick.original_key, hand: 'both', bpm: lick.default_bpm, loop: false })
    void engine.play()
    setPlayingId(id)
  }

  /** Åpne en lick i preview-panelet (full øvingsvisning) og rull dit. */
  const openPreview = (lick: Lick) => {
    getEngine().stop()
    setPlayingId(null)
    setPreview(lick)
    requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const playScaleTone = (midi: number) => {
    void getEngine().playNote(midi, 0.8)
  }

  const keyLabel = `${KEY_NAMES[sessionKey.root]}${sessionKey.mode === 'minor' ? '-moll' : '-dur'}`
  const rootName = KEY_NAMES[pitchClass(rootPc)]

  return (
    <div className="flex flex-col gap-8">
      {/* 1) Skala-velger — chips gruppert */}
      <section>
        <h2 className="mb-1 font-display text-2xl text-[var(--color-ivory)]">Velg en skala</h2>
        <p className="mb-4 max-w-2xl text-sm text-[var(--color-muted)]">
          Skalaene vises fra grunntonen i din toneart ({keyLabel}). Bytt toneart over for å flytte dem.
        </p>
        <div className="flex flex-col gap-4">
          {SCALE_GROUP_ORDER.map((group) => (
            <div key={group}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                {SCALE_GROUP_LABEL[group]}
              </h3>
              <div className="flex flex-wrap gap-2">
                {SCALES.filter((s) => s.group === group).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setScaleId(s.id)}
                    aria-pressed={s.id === scaleId}
                    className={cn(
                      'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                      s.id === scaleId
                        ? cn(ember.bg, ember.ink, ember.border)
                        : 'border-[var(--color-border)] bg-[var(--color-raised)] text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Valgt skala → kort med tangenter, formel, forklaring, hør-knapp */}
      <ScaleCard
        scale={scale}
        rootName={rootName}
        keyPitches={keyPitches}
        rootPc={rootPc}
        onKeyPress={playScaleTone}
        onHear={() =>
          hear('scale', generatedToLick(scalePracticeLick(rootPc, scale, 'opp-ned'), 'scale'))
        }
        hearing={playingId === 'scale' && (isPlaying || isLoading)}
        loading={playingId === 'scale' && isLoading}
      />

      {/* 2) Øvemønstre */}
      <section>
        <h2 className="mb-1 font-display text-2xl text-[var(--color-ivory)]">Øv på mønstre</h2>
        <p className="mb-4 max-w-2xl text-sm text-[var(--color-muted)]">
          Åpne et mønster i full øvingsvisning under — med vent-modus, tempo-trapp, metronom og transponering.
        </p>
        <div className="flex flex-wrap gap-3">
          {PATTERNS.map((pattern) => (
            <button
              key={pattern}
              type="button"
              onClick={() => openPreview(generatedToLick(scalePracticeLick(rootPc, scale, pattern), 'scale-pattern'))}
              className={cn(
                'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-left transition-colors',
                ember.hoverBorder,
              )}
            >
              <div className="font-display text-lg text-[var(--color-ivory)]">{PATTERN_TITLE[pattern]}</div>
              <div className="text-xs text-[var(--color-muted)]">{scale.name} {SCALE_PATTERN_LABEL[pattern]}</div>
            </button>
          ))}
        </div>
      </section>

      {/* 3) Over en akkord — rangerte forslag */}
      <section>
        <h2 className="mb-1 font-display text-2xl text-[var(--color-ivory)]">Over en akkord</h2>
        <p className="mb-4 max-w-2xl text-sm text-[var(--color-muted)]">
          Velg en akkord fra sangen din — under viser vi hvilke skalaer som passer over den, rangert,
          og du kan høre skalaen spilt over akkorden.
        </p>
        <div className="mb-6">
          <SpiceChordPicker diatonic={diatonic} value={chordChoice} onChange={setChordChoice} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {fits.map((fit, i) => {
            const fitScale = SCALE_BY_ID.get(fit.scaleId)
            if (!fitScale) return null
            const hearId = `over-${fit.scaleId}-${i}`
            return (
              <FitCard
                key={hearId}
                scale={fitScale}
                fit={fit}
                chordLabel={chordLabel(chordChoice.root, chordChoice.quality)}
                onHear={() =>
                  hear(hearId, generatedToLick(scaleOverChordLick(chordChoice.root, fitScale, chordChoice), 'scale-over'))
                }
                hearing={playingId === hearId && (isPlaying || isLoading)}
                loading={playingId === hearId && isLoading}
                onPractice={() =>
                  openPreview(
                    generatedToLick(
                      scalePracticeLick(chordChoice.root, fitScale, 'opp-ned', { chord: chordChoice }),
                      'scale-over-practice',
                    ),
                  )
                }
              />
            )
          })}
        </div>
      </section>

      {/* 4) Preview-panel — full øvingsmotor for valgt mønster/skala */}
      <div ref={previewRef} className="scroll-mt-20">
        {preview ? (
          <Practice slug={preview.slug} lick={preview} />
        ) : (
          <p className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-muted)]">
            Trykk «Øv» på et mønster eller forslag over for å øve på det her — metronom, transponering og
            vent-modus fungerer som vanlig.
          </p>
        )}
      </div>
    </div>
  )
}

/** Kortet for den valgte skalaen: tangenter, formel, forklaring, «Hør skalaen». */
function ScaleCard({
  scale,
  rootName,
  keyPitches,
  rootPc,
  onKeyPress,
  onHear,
  hearing,
  loading,
}: {
  scale: ScaleDef
  rootName: string
  keyPitches: number[]
  rootPc: number
  onKeyPress: (midi: number) => void
  onHear: () => void
  hearing: boolean
  loading: boolean
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-xl text-[var(--color-ivory)]">
          {rootName} {scale.name}
        </h3>
        <span className="font-mono text-sm text-[var(--color-muted)]">{scale.formula}</span>
      </div>
      <div className="mb-4">
        <MiniKeyboard pitches={keyPitches} root={pitchClass(rootPc)} onKeyPress={onKeyPress} />
      </div>
      <p className="mb-4 max-w-2xl text-sm text-[var(--color-muted)]">{scale.short}</p>
      <div className="flex flex-wrap items-center gap-3">
        <HearButton onClick={onHear} hearing={hearing} loading={loading} label="Hør skalaen" />
        {scale.glossaryId && (
          <Link
            href={`/oppslagsverk#${scale.glossaryId}`}
            className={cn('flex items-center gap-1.5 text-sm font-medium', ember.text)}
          >
            <BookOpen className="h-4 w-4" /> Les mer
          </Link>
        )}
      </div>
    </section>
  )
}

/** Et rangert skala-forslag over den valgte akkorden. */
function FitCard({
  scale,
  fit,
  chordLabel: chordText,
  onHear,
  hearing,
  loading,
  onPractice,
}: {
  scale: ScaleDef
  fit: { rank: 1 | 2 | 3; why: string }
  chordLabel: string
  onHear: () => void
  hearing: boolean
  loading: boolean
  onPractice: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
            fit.rank === 1 ? cn(ember.bg, ember.ink) : 'bg-[var(--color-raised)] text-[var(--color-muted)]',
          )}
          aria-label={`Rangert ${fit.rank}`}
        >
          {fit.rank}
        </span>
        <span className="font-display text-lg text-[var(--color-ivory)]">{scale.name}</span>
      </div>
      <p className="font-mono text-xs text-[var(--color-muted)]">{scale.formula}</p>
      <p className="flex-1 text-sm text-[var(--color-muted)]">{fit.why}</p>
      <div className="flex flex-wrap items-center gap-2">
        <HearButton onClick={onHear} hearing={hearing} loading={loading} label={`Hør over ${chordText}`} />
        <button
          type="button"
          onClick={onPractice}
          className={cn(
            'rounded-full border border-[var(--color-border)] px-3.5 py-1.5 text-sm font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-ivory)]',
            ember.hoverBorder,
          )}
        >
          Øv
        </button>
      </div>
    </div>
  )
}

/** Delt «Hør»-knapp: Play → Loader (laster sampler) → Square (stopp). */
function HearButton({
  onClick,
  hearing,
  loading,
  label,
}: {
  onClick: () => void
  hearing: boolean
  loading: boolean
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
        ember.bg,
        ember.ink,
      )}
      aria-label={hearing ? 'Stopp' : label}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : hearing ? (
        <Square className="h-4 w-4" />
      ) : (
        <Play className="h-4 w-4" />
      )}
      {label}
    </button>
  )
}
