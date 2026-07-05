'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Music, BarChart3, Share2, Check, Piano, Plug, ChevronLeft, ChevronRight, Users, Repeat } from 'lucide-react'
import type { Lick, HandFilter } from '@/types/lick'
import { fetchLick } from '@/lib/licks'
import { transposedNotes, transposedChords } from '@/lib/transpose'
import { getEngine } from '@/lib/playback'
import { usePlayer } from '@/lib/store'
import { KEY_NAMES } from '@/lib/music'
import { CATEGORY_LABEL, GENRE_LABEL, DIFFICULTY_LABEL, difficultyDots } from '@/lib/labels'
import { parseShare, buildShare } from '@/lib/share'
import { recordPractice } from '@/lib/progress'
import { useCollections } from '@/lib/collections'
import { CURATED_PATHS } from '@/data/curated-paths'
import { useWaitMode } from '@/lib/useWaitMode'
import { connectMidi, midiSupported, type MidiConnection } from '@/lib/midi'
import { cn } from '@/lib/cn'
import { Keyboard } from './Keyboard'
import { PianoRoll } from './PianoRoll'
import { Notation } from './Notation'
import { ChordStrip } from './ChordStrip'
import { TransportBar } from './TransportBar'
import { FavoriteButton } from './FavoriteButton'
import { AddToListButton } from './AddToListButton'
import { ExportButton } from './ExportButton'

type View = 'roll' | 'notation'

export function Practice({ slug }: { slug: string }) {
  const [lick, setLick] = useState<Lick | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [targetKey, setTargetKey] = useState(0)
  const [bpm, setBpm] = useState(80)
  const [hand, setHand] = useState<HandFilter>('both')
  const [loop, setLoop] = useState(true)
  const [view, setView] = useState<View>('roll')
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
  const [listCtx, setListCtx] = useState<{ kind: 'list' | 'path'; id: string; index: number } | null>(null)

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
  useEffect(() => {
    let alive = true
    loadCollections()
    fetchLick(slug).then((l) => {
      if (!alive) return
      if (!l) return setNotFound(true)
      const q = new URLSearchParams(window.location.search)
      const share = parseShare(window.location.search)
      const listId = q.get('list')
      const pathId = q.get('path')
      const index = Number(q.get('i') ?? 0) || 0
      setListCtx(
        listId ? { kind: 'list', id: listId, index } : pathId ? { kind: 'path', id: pathId, index } : null,
      )
      setLick(l)
      setTargetKey(share.key ?? l.original_key)
      setBpm(share.bpm ?? l.default_bpm)
      setLoopB(l.beats)
      setLoopA(0)
      if (share.hand) setHand(share.hand)
      syncedRef.current = true
    })
    return () => {
      alive = false
    }
  }, [slug])

  // Reflect practice state back into the URL (after the initial load applied it).
  const syncedRef = useRef(false)
  useEffect(() => {
    if (!syncedRef.current) return
    const qs = buildShare({ key: targetKey, bpm, hand })
    const extra = listCtx ? `&${listCtx.kind}=${listCtx.id}&i=${listCtx.index}` : ''
    window.history.replaceState(null, '', `${window.location.pathname}?${qs}${extra}`)
  }, [targetKey, bpm, hand, listCtx])

  // Dispose the audio engine when leaving the page.
  useEffect(() => () => getEngine().dispose(), [])

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

  if (notFound) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-[var(--color-muted)]">Fant ikke denne licken.</p>
        <Link href="/" className="mt-4 inline-block text-[var(--color-amber)]">
          ← Tilbake til biblioteket
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
    ? listCtx.kind === 'path'
      ? (CURATED_PATHS.find((p) => p.id === listCtx.id) ?? null)
      : (lists.find((l) => l.id === listCtx.id) ?? null)
    : null
  const goTo = (idx: number) => {
    if (!navList || !listCtx) return
    const s = navList.slugs[idx]
    if (s) router.push(`/lick/${s}?${listCtx.kind}=${listCtx.id}&i=${idx}`)
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ivory)]"
        >
          <ArrowLeft className="h-4 w-4" /> Biblioteket
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
          <span className="tracking-widest text-[var(--color-amber)]" title={DIFFICULTY_LABEL[lick.difficulty]}>
            {difficultyDots(lick.difficulty)}
          </span>
          <span>
            Original: {KEY_NAMES[lick.original_key]}-dur · {lick.default_bpm} BPM
          </span>
        </div>
        <h1 className="mt-2 font-display text-3xl text-[var(--color-ivory)] sm:text-4xl">{lick.name}</h1>
        {lick.description && (
          <p className="mt-2 max-w-2xl text-[var(--color-muted)]">{lick.description}</p>
        )}
      </header>

      <div className="flex flex-col gap-4">
        <Keyboard
          notes={notesForKeyboard}
          currentBeat={practiceOn ? -1 : isPlaying ? currentBeat : 0}
          expected={practiceOn ? waitMode.expected : undefined}
          feedback={practiceOn ? waitMode.feedback : undefined}
          onKeyPress={(m) => inputRef.current(m)}
        />
        <ChordStrip chords={chords} beats={lick.beats} currentBeat={practiceOn ? -1 : currentBeat} />

        {/* View toggle + share */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
            <ViewTab active={view === 'roll'} onClick={() => setView('roll')} icon={<BarChart3 className="h-4 w-4" />}>
              Pianorull
            </ViewTab>
            <ViewTab active={view === 'notation'} onClick={() => setView('notation')} icon={<Music className="h-4 w-4" />}>
              Noter
            </ViewTab>
          </div>
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
        />
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
