'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Music,
  BarChart3,
  Share2,
  Check,
  Piano,
  Plug,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  Repeat,
  SlidersHorizontal,
} from 'lucide-react'
import type { Lick, HandFilter } from '@/types/lick'
import { fetchLick } from '@/lib/licks'
import { transposedNotes, transposedChords } from '@/lib/transpose'
import { getEngine } from '@/lib/playback'
import { installAudioUnlock } from '@/lib/audio-unlock'
import { usePlayer } from '@/lib/store'
import { KEY_NAMES, chordPitchClasses } from '@/lib/music'
import { CATEGORY_LABEL, GENRE_LABEL } from '@/lib/labels'
import { parseShare, buildShare } from '@/lib/share'
import { recordPractice, todayKey } from '@/lib/progress'
import { getDailySessionSlugs } from '@/lib/daily'
import { useCollections } from '@/lib/collections'
import { CURATED_PATHS } from '@/data/curated-paths'
import { useWaitMode } from '@/lib/useWaitMode'
import { connectMidi, midiSupported, type MidiConnection } from '@/lib/midi'
import { cn } from '@/lib/cn'
import { useSession } from '@/lib/session'
import { Keyboard } from './Keyboard'
import { PianoRoll } from './PianoRoll'
import { Notation } from './NotationLazy'
import { ChordStrip } from './ChordStrip'
import { TransportBar } from './TransportBar'
import { DifficultyBadge } from './DifficultyBadge'
import { FavoriteButton } from './FavoriteButton'
import { AddToListButton } from './AddToListButton'
import { ExportButton } from './ExportButton'
import { GlossaryText } from './glossary/GlossaryText'

type View = 'roll' | 'notation'

interface PracticeProps {
  /** Slug of a published/fallback lick to fetch. Ignored when `lick` is given. */
  slug: string
  /**
   * A fully-formed, already-in-memory Lick to play directly — skips the
   * fetch entirely and feeds the same practice engine (metronome/loop/wait
   * mode/transpose/export). Used by the generated-content flows (workstream
   * D/E) to preview a not-yet-saved lick under a synthetic slug (e.g. one
   * that isn't published, or doesn't exist in the DB at all).
   */
  lick?: Lick
}

export function Practice({ slug, lick: lickProp }: PracticeProps) {
  const [lick, setLick] = useState<Lick | null>(lickProp ?? null)
  const [notFound, setNotFound] = useState(false)
  const [targetKey, setTargetKey] = useState(0)
  const [bpm, setBpm] = useState(80)
  const [hand, setHand] = useState<HandFilter>('both')
  const [loop, setLoop] = useState(true)
  const [view, setView] = useState<View>('roll')
  // Global lyd-preferanse (AppShell speiler den inn i motoren — se AppShell.tsx)
  const instrument = useSession((s) => s.instrument)
  const setInstrument = useSession((s) => s.setInstrument)
  const [showOverlay, setShowOverlay] = useState(false)
  const [copied, setCopied] = useState(false)
  const [ramp, setRamp] = useState(false)
  const [swing, setSwing] = useState(0)
  const [practiceOn, setPracticeOn] = useState(false)
  const [bandMode, setBandMode] = useState(false)
  const [backingHand, setBackingHand] = useState<'L' | 'R'>('L')
  const [abLoop, setAbLoop] = useState(false)
  const [loopA, setLoopA] = useState(0)
  const [loopB, setLoopB] = useState(8)
  const [midi, setMidi] = useState<MidiConnection | null>(null)
  const [midiError, setMidiError] = useState<string | null>(null)
  const [listCtx, setListCtx] = useState<{ kind: 'list' | 'path' | 'daily'; id: string; index: number } | null>(null)
  const [toolsOpen, setToolsOpen] = useState(false)

  const router = useRouter()
  const loadCollections = useCollections((s) => s.load)
  const lists = useCollections((s) => s.lists)

  const isPlaying = usePlayer((s) => s.isPlaying)
  const isLoading = usePlayer((s) => s.isLoading)
  const currentBeat = usePlayer((s) => s.currentBeat)
  const metronome = usePlayer((s) => s.metronome)
  const countIn = usePlayer((s) => s.countIn)

  // Live values the rebuild effect reads without re-triggering on their change.
  const bpmRef = useRef(bpm)
  bpmRef.current = bpm
  const loopRef = useRef(loop)
  loopRef.current = loop
  const swingRef = useRef(swing)
  swingRef.current = swing

  // Which hand plays back: in band mode the app plays the BACKING hand while you
  // play the other one live.
  const playbackHand: HandFilter = bandMode ? backingHand : hand

  // Load the lick once; apply any shared URL state (?key=Eb&bpm=80&hand=R).
  // When `lick` is passed in directly (generated-content preview), skip the
  // fetch and apply the same URL-state logic to it — same engine, no network.
  useEffect(() => {
    let alive = true
    loadCollections()

    const applyLick = (l: Lick) => {
      if (!alive) return
      const q = new URLSearchParams(window.location.search)
      const share = parseShare(window.location.search)
      const listId = q.get('list')
      const pathId = q.get('path')
      const daily = q.get('daily') === '1'
      const index = Number(q.get('i') ?? 0) || 0
      setListCtx(
        daily
          ? { kind: 'daily', id: '1', index }
          : listId
            ? { kind: 'list', id: listId, index }
            : pathId
              ? { kind: 'path', id: pathId, index }
              : null,
      )
      setLick(l)
      setTargetKey(share.key ?? l.original_key)
      setBpm(share.bpm ?? l.default_bpm)
      setLoopB(l.beats)
      setLoopA(0)
      if (share.hand) setHand(share.hand)
      syncedRef.current = true
    }

    if (lickProp) {
      applyLick(lickProp)
      return () => {
        alive = false
      }
    }

    fetchLick(slug).then((l) => {
      if (!alive) return
      if (!l) return setNotFound(true)
      applyLick(l)
    })
    return () => {
      alive = false
    }
  }, [slug, lickProp])

  // Reflect practice state back into the URL (after the initial load applied it).
  const syncedRef = useRef(false)
  useEffect(() => {
    if (!syncedRef.current) return
    const qs = buildShare({ key: targetKey, bpm, hand })
    const extra = listCtx ? `&${listCtx.kind}=${listCtx.id}&i=${listCtx.index}` : ''
    window.history.replaceState(null, '', `${window.location.pathname}?${qs}${extra}`)
  }, [targetKey, bpm, hand, listCtx])

  // Install the iOS audio unlock on mount; dispose the engine on leave.
  useEffect(() => {
    installAudioUnlock()
    return () => getEngine().dispose()
  }, [])

  // (Re)build the Tone part whenever the notes change (lick / key / hand).
  // Tempo and loop change live and do NOT rebuild.
  useEffect(() => {
    if (!lick) return
    const engine = getEngine()
    const wasPlaying = usePlayer.getState().isPlaying
    if (wasPlaying) engine.stop() // key/hand change restarts from the top
    engine.build(lick, {
      targetKey,
      hand: playbackHand,
      bpm: bpmRef.current,
      loop: loopRef.current || abLoop || bandMode,
      swing: swingRef.current,
    })
    if (wasPlaying) void engine.play()
  }, [lick, targetKey, playbackHand, abLoop, bandMode])

  // Keep the engine's A-B loop range in sync with the UI (live, no rebuild).
  useEffect(() => {
    getEngine().setLoopRange(abLoop ? loopA : null, abLoop ? loopB : null)
  }, [abLoop, loopA, loopB])

  const notesForKeyboard = useMemo(
    () =>
      lick ? transposedNotes(lick, targetKey).filter((n) => playbackHand === 'both' || n.h === playbackHand) : [],
    [lick, targetKey, playbackHand],
  )
  const notesAll = useMemo(() => (lick ? transposedNotes(lick, targetKey) : []), [lick, targetKey])
  const chords = useMemo(() => (lick ? transposedChords(lick, targetKey) : []), [lick, targetKey])

  // Wait-mode trainer (input-gated step-through, MIDI or click).
  const onTrainerLoop = useCallback(() => recordPractice(slug, bpmRef.current), [slug])
  const waitMode = useWaitMode(notesForKeyboard, onTrainerLoop)
  const inputRef = useRef(waitMode.input)
  inputRef.current = waitMode.input

  // Toggle wait-mode: stop transport when entering, reset when leaving.
  useEffect(() => {
    if (practiceOn) {
      getEngine().stop()
      waitMode.start()
    } else {
      waitMode.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceOn])

  // Loop-boundary detection (auto mode): record progress + ramp tempo.
  const rampRef = useRef(ramp)
  rampRef.current = ramp
  const prevBeatRef = useRef(0)
  useEffect(() => {
    if (!isPlaying) {
      prevBeatRef.current = currentBeat
      return
    }
    if (currentBeat < prevBeatRef.current - 0.5) {
      recordPractice(slug, bpmRef.current)
      if (rampRef.current && bpmRef.current < 180) {
        const nb = Math.min(180, bpmRef.current + 4)
        setBpm(nb)
        getEngine().setTempo(nb)
      }
    }
    prevBeatRef.current = currentBeat
  }, [currentBeat, isPlaying, slug])

  // MIDI cleanup on unmount.
  useEffect(() => () => midi?.dispose(), [midi])

  // Single "Tilbake" affordance: prefer a real browser back-navigation when we
  // can tell the previous page was inside the app (same-origin referrer) —
  // this returns you to wherever you actually came from (a list, a course, a
  // search). Otherwise fall back to a deterministic, context-correct link: the
  // library (`/ove`) for a plain lick, the course index (`/kurs`) for a path,
  // or the specific practice list via `?list=<id>` — which OveView now reads to
  // reopen that list (see its mount restore), so the fallback is a real deep link.
  const backHref = listCtx
    ? listCtx.kind === 'daily'
      ? '/'
      : listCtx.kind === 'path'
        ? '/kurs'
        : `/ove?list=${listCtx.id}`
    : '/ove'
  const goBack = (e: React.MouseEvent) => {
    if (typeof document === 'undefined' || !document.referrer) return
    try {
      if (new URL(document.referrer).origin === window.location.origin) {
        e.preventDefault()
        router.back()
      }
    } catch {
      /* malformed referrer — fall through to the plain href */
    }
  }

  if (notFound) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-[var(--color-muted)]">Fant ikke denne licken.</p>
        <Link href={backHref} onClick={goBack} className="mt-4 inline-block text-[var(--color-amber)]">
          ← Tilbake
        </Link>
      </main>
    )
  }

  if (!lick) {
    return <main className="mx-auto max-w-md px-4 py-24 text-center text-[var(--color-muted)]">Laster …</main>
  }

  const onPlayToggle = () => {
    const engine = getEngine()
    if (usePlayer.getState().isPlaying) {
      engine.stop()
    } else {
      if (practiceOn) setPracticeOn(false)
      recordPractice(slug, bpm)
      void engine.play()
    }
  }
  const onBpm = (v: number) => {
    setBpm(v)
    getEngine().setTempo(v)
  }
  const onLoopToggle = () => {
    const next = !loop
    setLoop(next)
    getEngine().setLoop(next)
  }
  const onSwingToggle = () => {
    const next = swing > 0 ? 0 : 0.55
    setSwing(next)
    getEngine().setSwing(next)
  }
  const onShare = async () => {
    const qs = buildShare({ key: targetKey, bpm, hand })
    const url = `${window.location.origin}${window.location.pathname}?${qs}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked — no-op */
    }
  }
  const onConnectMidi = async () => {
    setMidiError(null)
    try {
      const conn = await connectMidi((m) => inputRef.current(m))
      setMidi(conn)
    } catch (e) {
      setMidiError(e instanceof Error ? e.message : 'Kunne ikke koble til MIDI')
    }
  }

  const navList = listCtx
    ? listCtx.kind === 'daily'
      ? { name: 'Dagens økt', slugs: getDailySessionSlugs(todayKey()) }
      : listCtx.kind === 'path'
        ? (CURATED_PATHS.find((p) => p.id === listCtx.id) ?? null)
        : (lists.find((l) => l.id === listCtx.id) ?? null)
    : null
  const goTo = (idx: number) => {
    if (!navList || !listCtx) return
    const s = navList.slugs[idx]
    if (s) router.push(`/lick/${s}?${listCtx.kind}=${listCtx.id}&i=${idx}`)
  }

  // Chord-tone overlay: tones of the chord active at the current beat.
  const overlayBeat = practiceOn ? -1 : isPlaying ? currentBeat : 0
  const overlay = showOverlay
    ? (() => {
        const c =
          chords.find((ch) => ch.t - 1e-6 <= overlayBeat && overlayBeat < ch.t + ch.d - 1e-6) ?? chords[0]
        return c ? { root: c.r, tones: new Set(chordPitchClasses(c.r, c.q)) } : undefined
      })()
    : undefined

  // Whether any advanced tool is currently engaged — surfaced as a dot on the
  // "Flere verktøy" toggle so a collapsed panel never hides an active state
  // from the player.
  const advancedActive = abLoop || practiceOn || bandMode || showOverlay

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href={backHref}
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ivory)]"
        >
          <ArrowLeft className="h-4 w-4" /> Tilbake
        </Link>
        <div className="flex items-center gap-2">
          <AddToListButton slug={lick.slug} />
          <FavoriteButton slug={lick.slug} size={20} />
        </div>
      </div>

      {navList && navList.slugs.length > 0 && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
          <button
            onClick={() => goTo(listCtx!.index - 1)}
            disabled={!listCtx || listCtx.index <= 0}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-[var(--color-ivory)] disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Forrige
          </button>
          <span className="truncate text-sm text-[var(--color-muted)]">
            {navList.name} · {(listCtx?.index ?? 0) + 1}/{navList.slugs.length}
          </span>
          <button
            onClick={() => goTo((listCtx?.index ?? 0) + 1)}
            disabled={!listCtx || listCtx.index >= navList.slugs.length - 1}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-[var(--color-ivory)] disabled:opacity-40"
          >
            Neste <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-muted)]">
          <span className="rounded-full border border-[var(--color-amber)]/40 bg-[var(--color-amber)]/10 px-2.5 py-0.5 text-[var(--color-amber)]">
            {GENRE_LABEL[lick.genre]}
          </span>
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] px-2.5 py-0.5">
            {CATEGORY_LABEL[lick.category]}
          </span>
          <DifficultyBadge difficulty={lick.difficulty} />
          <span>
            Original: {KEY_NAMES[lick.original_key]}-dur · {lick.default_bpm} BPM
          </span>
        </div>
        <h1 className="mt-2 font-display text-3xl text-[var(--color-ivory)] sm:text-4xl">{lick.name}</h1>
        {lick.description && (
          <GlossaryText text={lick.description} className="mt-2 max-w-2xl text-[var(--color-muted)]" />
        )}
      </header>

      <div className="flex flex-col gap-4">
        <Keyboard
          notes={notesForKeyboard}
          currentBeat={practiceOn ? -1 : isPlaying ? currentBeat : 0}
          expected={practiceOn ? waitMode.expected : undefined}
          feedback={practiceOn ? waitMode.feedback : undefined}
          overlay={overlay}
          onKeyPress={(m) => inputRef.current(m)}
        />
        <ChordStrip chords={chords} beats={lick.beats} currentBeat={practiceOn ? -1 : currentBeat} />

        {/* Primær: notasjon/pianorull-veksling */}
        <div className="flex gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1 self-start">
          <ViewTab active={view === 'roll'} onClick={() => setView('roll')} icon={<BarChart3 className="h-4 w-4" />}>
            Pianorull
          </ViewTab>
          <ViewTab active={view === 'notation'} onClick={() => setView('notation')} icon={<Music className="h-4 w-4" />}>
            Noter
          </ViewTab>
        </div>

        {view === 'roll' ? (
          <PianoRoll
            notes={notesAll}
            hand={playbackHand}
            beats={lick.beats}
            currentBeat={practiceOn ? -1 : currentBeat}
            loopRange={abLoop ? { a: loopA, b: loopB } : null}
          />
        ) : (
          <Notation notes={notesAll} beats={lick.beats} timeSignature={lick.time_signature} />
        )}

        {/* Primær: kjerne-transport (play/stopp, tempo, toneart, hånd) */}
        <TransportBar
          isPlaying={isPlaying}
          isLoading={isLoading}
          onPlayToggle={onPlayToggle}
          loop={loop}
          onLoopToggle={onLoopToggle}
          ramp={ramp}
          onRampToggle={() => setRamp((v) => !v)}
          metronome={metronome}
          onMetronomeToggle={() => usePlayer.getState().set({ metronome: !usePlayer.getState().metronome })}
          countIn={countIn}
          onCountInToggle={() => usePlayer.getState().set({ countIn: !usePlayer.getState().countIn })}
          swing={swing}
          onSwingToggle={onSwingToggle}
          bpm={bpm}
          defaultBpm={lick.default_bpm}
          onBpm={onBpm}
          targetKey={targetKey}
          onKey={setTargetKey}
          hand={hand}
          onHand={setHand}
          instrument={instrument}
          onInstrument={setInstrument}
        />

        {/* Øvemodus (vent-modus): surfaced here as a first-class chip so it's
            discoverable without opening "Flere verktøy" — same practiceOn state
            as the detailed panel below. */}
        <button
          onClick={() => {
            setPracticeOn((v) => !v)
            if (!practiceOn) setBandMode(false)
          }}
          aria-pressed={practiceOn}
          title="Øv med vent-modus — appen venter på at du spiller riktig tangent"
          className={cn(
            'flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
            practiceOn
              ? 'border-[var(--color-sea)] bg-[var(--color-sea)]/15 text-[var(--color-sea)]'
              : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
          )}
        >
          <Piano className="h-4 w-4" /> Øvemodus
        </button>

        {/* Avansert: progressiv avsløring — akkordtoner, eksport/del, A-B-loop,
            øve-/vent-modus, band-modus og MIDI flytter bak denne bryteren. */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setToolsOpen((v) => !v)}
            aria-expanded={toolsOpen}
            className={cn(
              'flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
              advancedActive
                ? 'border-[var(--color-amber)] bg-[var(--color-amber)]/10 text-[var(--color-amber)]'
                : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Flere verktøy
            {advancedActive && (
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--color-amber)]" />
            )}
            <ChevronDown className={cn('h-4 w-4 transition-transform', toolsOpen && 'rotate-180')} />
          </button>

          {toolsOpen && (
            <div className="animate-fade-in flex flex-col gap-4">
              {/* Akkordtoner-overlay + eksport + del */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => setShowOverlay((v) => !v)}
                  aria-pressed={showOverlay}
                  title="Vis tonene i gjeldende akkord på klaviaturet"
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
                    showOverlay
                      ? 'border-[var(--color-sea)] bg-[var(--color-sea)]/15 text-[var(--color-sea)]'
                      : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
                  )}
                >
                  <Music className="h-4 w-4" /> Akkordtoner
                </button>
                <div className="flex items-center gap-2">
                  <ExportButton lick={lick} targetKey={targetKey} bpm={bpm} />
                  <button
                    onClick={onShare}
                    className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-ivory)]"
                  >
                    {copied ? <Check className="h-4 w-4 text-[var(--color-sea)]" /> : <Share2 className="h-4 w-4" />}
                    {copied ? 'Kopiert' : 'Del'}
                  </button>
                </div>
              </div>

              {/* A-B section loop */}
              <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <button
                  onClick={() => setAbLoop((v) => !v)}
                  aria-pressed={abLoop}
                  className={cn(
                    'flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    abLoop
                      ? 'border-[var(--color-amber)] bg-[var(--color-amber)]/15 text-[var(--color-amber)]'
                      : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
                  )}
                >
                  <Repeat className="h-4 w-4" /> Loop A–B (øv en del)
                </button>
                {abLoop && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                    <label className="flex flex-1 items-center gap-2 text-sm text-[var(--color-muted)]">
                      <span className="w-8">A: {loopA}</span>
                      <input
                        type="range"
                        min={0}
                        max={lick.beats - 0.5}
                        step={0.5}
                        value={loopA}
                        onChange={(e) => setLoopA(Math.min(Number(e.target.value), loopB - 0.5))}
                        className="flex-1 accent-[var(--color-amber)]"
                      />
                    </label>
                    <label className="flex flex-1 items-center gap-2 text-sm text-[var(--color-muted)]">
                      <span className="w-8">B: {loopB}</span>
                      <input
                        type="range"
                        min={0.5}
                        max={lick.beats}
                        step={0.5}
                        value={loopB}
                        onChange={(e) => setLoopB(Math.max(Number(e.target.value), loopA + 0.5))}
                        className="flex-1 accent-[var(--color-amber)]"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Wait-mode trainer */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setPracticeOn((v) => !v)
                        if (!practiceOn) setBandMode(false)
                      }}
                      aria-pressed={practiceOn}
                      className={cn(
                        'flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                        practiceOn
                          ? 'border-[var(--color-sea)] bg-[var(--color-sea)]/15 text-[var(--color-sea)]'
                          : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
                      )}
                    >
                      <Piano className="h-4 w-4" /> Øvemodus (vent-modus)
                    </button>
                    <button
                      onClick={() => {
                        setBandMode((v) => !v)
                        if (!bandMode) setPracticeOn(false)
                      }}
                      aria-pressed={bandMode}
                      className={cn(
                        'flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                        bandMode
                          ? 'border-[var(--color-sea)] bg-[var(--color-sea)]/15 text-[var(--color-sea)]'
                          : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
                      )}
                    >
                      <Users className="h-4 w-4" /> Band-modus
                    </button>
                    {bandMode && (
                      <button
                        onClick={() => setBackingHand((h) => (h === 'L' ? 'R' : 'L'))}
                        className="rounded-full border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-ivory)]"
                      >
                        App spiller: {backingHand === 'L' ? 'venstre' : 'høyre'} hånd
                      </button>
                    )}
                  </div>

                  {midiSupported() ? (
                    midi ? (
                      <span className="flex items-center gap-1.5 text-sm text-[var(--color-sea)]">
                        <Plug className="h-4 w-4" /> {midi.deviceNames[0] ?? 'MIDI tilkoblet'}
                      </span>
                    ) : (
                      <button
                        onClick={onConnectMidi}
                        className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3.5 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-ivory)]"
                      >
                        <Plug className="h-4 w-4" /> Koble til MIDI-keyboard
                      </button>
                    )
                  ) : (
                    <span className="text-xs text-[var(--color-muted)]">
                      MIDI krever Chrome/Edge — eller klikk tangentene
                    </span>
                  )}
                </div>

                {practiceOn && (
                  <p className="mt-3 text-sm text-[var(--color-muted)]">
                    Spill de <span className="text-[var(--color-amber)]">markerte</span> tangentene i rekkefølge
                    {waitMode.total > 0 && (
                      <>
                        {' — '}
                        <span className="font-display text-[var(--color-ivory)]">
                          trinn {waitMode.step + 1} / {waitMode.total}
                        </span>
                      </>
                    )}
                    . Grønt = riktig, rødt = bom. Bruk MIDI eller klikk.
                  </p>
                )}
                {midiError && <p className="mt-2 text-xs text-[var(--color-blight,#C7534E)]">{midiError}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function ViewTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-[var(--color-raised)] text-[var(--color-ivory)]' : 'text-[var(--color-muted)]',
      )}
    >
      {icon}
      {children}
    </button>
  )
}
