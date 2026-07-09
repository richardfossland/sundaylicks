'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { ChevronDown, Plus, X } from 'lucide-react'
import type { Difficulty, Genre, Lick } from '@/types/lick'
import { FALLBACK_LICKS, fetchLicks } from '@/lib/licks'
import { useCollections } from '@/lib/collections'
import { useSession } from '@/lib/session'
import { LickCard } from '@/components/LickCard'
import { SpiceChordPicker, type ChordChoice } from '@/components/SpiceChordPicker'
import { SpiceGeneratedCard } from '@/components/SpiceGeneratedCard'
import { Term } from '@/components/glossary/Term'
import { ChordStrip } from '@/components/ChordStrip'
import { GENRE_LABEL, GENRE_ORDER } from '@/lib/labels'
import { KEY_NAMES, chordLabel } from '@/lib/music'
import { ACCENT_CLASSES } from '@/lib/modes'
import { diatonicChords } from '@/lib/theory/keys'
import type { TransitionLevel } from '@/lib/theory/transitions'
import {
  fillsForChord,
  generatedToLick,
  LEVEL_LABEL,
  LEVEL_TO_DIFFICULTY,
  progressionToChords,
  reharmSuggestions,
  spiceForProgression,
  spiceGroupsForKey,
  voicingLick,
  voicingStylesForLevel,
  VOICING_STYLE_LABEL,
  type ProgressionStep,
} from '@/lib/spice'
import { cn } from '@/lib/cn'

// Tone.js touches the AudioContext — must never run during SSR / the Cloudflare
// Worker render, same as the /lick/[slug] page.
const Practice = dynamic(() => import('@/components/Practice').then((m) => m.Practice), {
  ssr: false,
  loading: () => <p className="py-10 text-center text-[var(--color-muted)]">Laster spilleren …</p>,
})

const LEVELS: TransitionLevel[] = ['simple', 'intermediate', 'advanced']
const ember = ACCENT_CLASSES.ember

/**
 * "Krydre" — the simplified /spice flow. The old page had two overlapping
 * controls ("Nivå"-filter for the library, an "enkelt ↔ spice it up"-slider
 * for the generated reharm/voicings) — merged here into the ONE "hvor
 * avansert"-toggle below, which drives both. The library-browse and
 * progression-builder sections, which used to compete with "over denne
 * akkorden" for attention, are now optional, collapsed-by-default
 * sub-sections — the primary flow is: pick a chord, see results underneath.
 */
export function KrydreTab() {
  const sessionKey = useSession((s) => s.key)
  const loadCollections = useCollections((s) => s.load)

  const [licks, setLicks] = useState<Lick[]>(FALLBACK_LICKS)
  const [genre, setGenre] = useState<Genre | 'all'>('all')
  const [level, setLevel] = useState<TransitionLevel>('intermediate')
  const [progression, setProgression] = useState<ProgressionStep[]>([])
  const [preview, setPreview] = useState<Lick | null>(null)
  const [showProgression, setShowProgression] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)

  const [chordChoice, setChordChoice] = useState<ChordChoice>({ root: sessionKey.root, quality: 'maj7' })

  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    fetchLicks().then((rows) => {
      if (alive) setLicks(rows)
    })
    loadCollections()
    return () => {
      alive = false
    }
  }, [loadCollections])

  // Keep the chord picker's default landing on the current key's tonic
  // whenever "din toneart" changes — the user can still pick freely after.
  useEffect(() => {
    const tonic = diatonicChords(sessionKey)[0]
    setChordChoice({ root: tonic.root, quality: tonic.quality, roman: tonic.roman })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey.root, sessionKey.mode])

  const difficulty: Difficulty = LEVEL_TO_DIFFICULTY[level]
  const effectiveGenre: Genre = genre === 'all' ? 'jazz' : genre

  const groups = useMemo(
    () => spiceGroupsForKey(licks, sessionKey, { genre, difficulty }),
    [licks, sessionKey, genre, difficulty],
  )

  const diatonic = useMemo(() => diatonicChords(sessionKey, { harmonic: true }), [sessionKey])

  const fills = useMemo(
    () => fillsForChord(licks, chordChoice.root, chordChoice.quality, genre),
    [licks, chordChoice, genre],
  )

  const reharmResults = useMemo(
    () =>
      reharmSuggestions(
        sessionKey,
        chordChoice.root,
        chordChoice.quality,
        level,
        effectiveGenre,
        `${chordChoice.root}-${chordChoice.quality}-${level}`,
      ),
    [sessionKey, chordChoice, level, effectiveGenre],
  )
  const reharmLicks = useMemo(
    () => reharmResults.map((r) => ({ badge: r.label, lick: generatedToLick(r.lick, 'reharm') })),
    [reharmResults],
  )

  const voicingStyles = useMemo(() => voicingStylesForLevel(level), [level])
  const voicingLicks = useMemo(
    () =>
      voicingStyles.map((style) => ({
        badge: VOICING_STYLE_LABEL[style],
        lick: generatedToLick(voicingLick(chordChoice.root, chordChoice.quality, style, { genre: effectiveGenre }), 'voicing'),
      })),
    [voicingStyles, chordChoice, effectiveGenre],
  )

  const progressionChords = useMemo(() => progressionToChords(progression), [progression])
  const progressionSuggestions = useMemo(
    () =>
      progression.length > 0
        ? spiceForProgression(progression, { genre: effectiveGenre, level }).map((g, i) => ({
            step: progression[i],
            lick: generatedToLick(g, 'progression'),
          }))
        : [],
    [progression, effectiveGenre, level],
  )

  const play = (l: Lick) => {
    setPreview(l)
    requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const addToProgression = () => {
    setProgression((p) => (p.length >= 8 ? p : [...p, chordChoice]))
    setShowProgression(true)
  }

  const keyLabel = `${KEY_NAMES[sessionKey.root]}${sessionKey.mode === 'minor' ? '-moll' : '-dur'}`

  return (
    <div className="flex flex-col gap-8">
      {/* Filters: sjanger (independent) + the ONE "hvor avansert"-control */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          label="Sjanger"
          value={genre}
          onChange={(v) => setGenre(v as Genre | 'all')}
          options={[{ value: 'all', label: 'Alle' }, ...GENRE_ORDER.map((g) => ({ value: g, label: GENRE_LABEL[g] }))]}
        />
        <div
          role="group"
          aria-label="Hvor avansert"
          className="ml-auto flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] p-1"
        >
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={level === l}
              onClick={() => setLevel(l)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                level === l ? cn(ember.bg, ember.ink) : 'text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
              )}
            >
              {LEVEL_LABEL[l]}
            </button>
          ))}
        </div>
      </div>

      {/* Primary flow: velg → resultater under */}
      <section>
        <h2 className="mb-1 font-display text-2xl text-[var(--color-ivory)]">Velg en akkord i {keyLabel}</h2>
        <p className="mb-4 max-w-2xl text-sm text-[var(--color-muted)]">
          Velg en <Term id="diatonisk">diatonisk</Term> grad, eller sett en egen akkord — under ser du
          bibliotek-<Term id="fill">fills</Term> og genererte{' '}
          <Term id="reharmonisering">reharm</Term>-/<Term id="voicing">voicing</Term>-forslag over den.
        </p>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <SpiceChordPicker diatonic={diatonic} value={chordChoice} onChange={setChordChoice} />
          <button
            type="button"
            onClick={addToProgression}
            disabled={progression.length >= 8}
            className="flex items-center gap-1.5 rounded-full border border-dashed border-[var(--color-border)] px-3.5 py-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-ivory)] disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" /> Legg {chordLabel(chordChoice.root, chordChoice.quality)} i progresjon
          </button>
        </div>

        {fills.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Bibliotek-fills over {chordLabel(chordChoice.root, chordChoice.quality)}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fills.map((l) => (
                <LickCard key={l.slug} lick={l} targetKey={chordChoice.root} />
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-[var(--color-muted)]">Reharm-forslag</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reharmLicks.map(({ badge, lick: l }) => (
              <SpiceGeneratedCard key={l.id} lick={l} badge={badge} active={preview?.id === l.id} onPlay={() => play(l)} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-[var(--color-muted)]">Voicinger</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {voicingLicks.map(({ badge, lick: l }) => (
              <SpiceGeneratedCard key={l.id} lick={l} badge={badge} active={preview?.id === l.id} onPlay={() => play(l)} />
            ))}
          </div>
        </div>
      </section>

      {/* Optional: progression builder — collapsed by default, no longer a competing block */}
      <Collapsible
        title={`Bygg en progresjon${progression.length > 0 ? ` (${progression.length})` : ' (valgfritt)'}`}
        open={showProgression}
        onToggle={setShowProgression}
      >
        {progression.length === 0 ? (
          <p className="text-[var(--color-muted)]">Ingen akkorder lagt til enda — bruk «Legg … i progresjon» over.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {progression.map((s, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] px-3 py-1 text-sm text-[var(--color-ivory)]"
                >
                  {s.roman ?? chordLabel(s.root, s.quality)}
                  <button
                    type="button"
                    aria-label="Fjern akkord"
                    onClick={() => setProgression((p) => p.filter((_, j) => j !== i))}
                    className="text-[var(--color-muted)] hover:text-[var(--color-ivory)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setProgression([])}
                className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ivory)]"
              >
                Tøm
              </button>
            </div>
            <div className="mb-5">
              <ChordStrip chords={progressionChords} beats={progression.length * 4} currentBeat={-1} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {progressionSuggestions.map(({ step, lick: l }) => (
                <SpiceGeneratedCard
                  key={l.id}
                  lick={l}
                  badge={step.roman ?? chordLabel(step.root, step.quality)}
                  active={preview?.id === l.id}
                  onPlay={() => play(l)}
                />
              ))}
            </div>
          </>
        )}
      </Collapsible>

      {/* Optional: the library, re-projected into the current key */}
      <Collapsible title={`Bla i biblioteket i ${keyLabel}`} open={showLibrary} onToggle={setShowLibrary}>
        {groups.length === 0 ? (
          <p className="text-[var(--color-muted)]">Ingen bibliotek-treff for disse filtrene i {keyLabel} — prøv «Alle» sjangre.</p>
        ) : (
          groups.map((g) => (
            <div key={g.category} className="mb-6 last:mb-0">
              <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-[var(--color-muted)]">{g.label}</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((l) => (
                  <LickCard key={l.slug} lick={l} targetKey={sessionKey.root} />
                ))}
              </div>
            </div>
          ))
        )}
      </Collapsible>

      {/* Preview panel — reuses the full practice engine for a generated lick. */}
      <div ref={previewRef} className="scroll-mt-20">
        {preview ? (
          <Practice slug={preview.slug} lick={preview} />
        ) : (
          <p className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-muted)]">
            Trykk «Spill» på et forslag over for å øve på det her — metronom, transponering og vent-modus fungerer
            som vanlig.
          </p>
        )}
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] px-3 py-2 text-sm text-[var(--color-ivory)] outline-none focus:border-[var(--color-ember)]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function Collapsible({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: (v: boolean) => void
  children: React.ReactNode
}) {
  return (
    <details
      open={open}
      onToggle={(e) => onToggle((e.target as HTMLDetailsElement).open)}
      className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-display text-xl text-[var(--color-ivory)] [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-5 w-5 shrink-0 text-[var(--color-muted)] transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  )
}
