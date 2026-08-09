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
  Guitar,
} from 'lucide-react'
import type { Lick, LickNote, LickChord, HandFilter } from '@/types/lick'
import { instrumentForLick, type InstrumentKind } from '@/lib/instruments'
import { fetchLick } from '@/lib/licks'
import { transposedPlayableNotes, transposedChords } from '@/lib/transpose'
import { getEngine } from '@/lib/playback'
import { installAudioUnlock } from '@/lib/audio-unlock'
import { usePlayer, hydratePracticeDefaults } from '@/lib/store'
import { KEY_NAMES, chordPitchClasses } from '@/lib/music'
import { CATEGORY_LABEL, GENRE_LABEL } from '@/lib/labels'
import { parseShare, buildShare } from '@/lib/share'
import { recordPractice, todayKey } from '@/lib/progress'
import { getDailySessionSlugs } from '@/lib/daily'
import { useCollections } from '@/lib/collections'
import { CURATED_PATHS } from '@/data/curated-paths'
import { useWaitMode, type Feedback } from '@/lib/useWaitMode'
import { connectMidi, midiSupported, type MidiConnection } from '@/lib/midi'
import { cn } from '@/lib/cn'
import { useSession } from '@/lib/session'
import { BASS_EADG, GUITAR_STANDARD } from '@/lib/fretted/fretting'
import { Keyboard } from './Keyboard'
import { Fretboard } from './Fretboard'
import { PianoRoll } from './PianoRoll'
import { Notation } from './NotationLazy'
import { Tab } from './TabLazy'
import { ChordStrip } from './ChordStrip'
import { GrepPanel } from './GrepPanel'
import { TransportBar } from './TransportBar'
import { DifficultyBadge } from './DifficultyBadge'
import { FavoriteButton } from './FavoriteButton'
import { AddToListButton } from './AddToListButton'
import { ExportButton } from './ExportButton'
import { GlossaryText } from './glossary/GlossaryText'

type View = 'roll' | 'notation' | 'tab'

/**
 * Kjør en jobb UTENFOR den lyd-kritiske rammen. queueMicrotask holder ikke —
 * mikrotasker kjøres før nettleseren slipper rammen, altså fortsatt midt i
 * loop-wrappen. Ledig tid når nettleseren tilbyr det (med tak, så skrivingen
 * ikke utsettes i det uendelige), ellers neste makrotask.
 */
function deferOffFrame(fn: () => void) {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => fn(), { timeout: 500 })
    return
  }
  setTimeout(fn, 0)
}

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
  const [view, setView] = useState<View>(
    (lickProp?.instrument ?? 'piano') !== 'piano' ? 'tab' : 'roll',
  )
  // Side-lokal lyd (D5b): IKKE persistert. Init = fretted-lick → sitt eget
  // instrument (gitar/bass), ellers det globale session-instrumentet. En effekt
  // speiler den inn i motoren og gjenoppretter session-lyden når man forlater
  // siden. /innstillinger forblir global default; her overstyrer vi bare for
  // denne licken.
  const [pageInstrument, setPageInstrument] = useState<InstrumentKind>(() =>
    instrumentForLick(lickProp?.instrument, useSession.getState().instrument),
  )
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
  // NB: `currentBeat` (60 Hz) abonneres BEVISST ikke her — det ville re-rendret
  // hele denne siden per frame under avspilling. Hver forbruker av
  // avspillingshodet er isolert i sin egen liten løvkomponent nederst i fila
  // (LiveHero / LiveChordStrip / LivePianoRoll / LoopBoundaryWatcher), samme
  // mønster som <LiveRoll> i bla/ReelCard.tsx.
  const metronome = usePlayer((s) => s.metronome)
  const countIn = usePlayer((s) => s.countIn)

  // Live values the rebuild effect reads without re-triggering on their change.
  const bpmRef = useRef(bpm)
  bpmRef.current = bpm
  const loopRef = useRef(loop)
  loopRef.current = loop
  const swingRef = useRef(swing)
  swingRef.current = swing
  // Side-lokal lyd inn i build() UTEN å stå i effektens deps: et lyd-bytte skal
  // aldri bygge Parten på nytt (motoren slår opp noden per event).
  const pageInstrumentRef = useRef(pageInstrument)
  pageInstrumentRef.current = pageInstrument

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
      const inst = l.instrument ?? 'piano'
      const isFretted = inst !== 'piano'
      setView(isFretted ? 'tab' : 'roll')
      setPageInstrument(instrumentForLick(inst, useSession.getState().instrument))
      setTargetKey(share.key ?? l.original_key)
      setBpm(share.bpm ?? l.default_bpm)
      setLoopB(l.beats)
      setLoopA(0)
      // Nullstill de lick-avhengige modusene ved HVERT bytte. Liste-navigasjon
      // («Neste») gjenbruker denne komponenten, så hånd-filter, band-modus og
      // øvemodus ville ellers fulgt med over i neste lick — og på et bass-lick
      // er både hånd-velgeren og band-modus SKJULT (enstemmig, BD7): en arvet
      // 'L' ga tomt gripebrett og stum avspilling uten synlig vei tilbake.
      setHand('both')
      setBandMode(false)
      setPracticeOn(false)
      // Delelenker (?hand=L) skal fortsatt virke — men hånd-valget gir ingen
      // mening for et enstemmig bass-lick, så der ignoreres det (degraderer til
      // 'both' i stedet for et tomt brett).
      if (share.hand && inst !== 'bass') setHand(share.hand)
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
    // Bevisst smal: effekten skal hente licken på nytt KUN når licken endres.
    // `loadCollections` er zustand-butikkens stabile `load`, men å ta den med
    // ville gjort en butikk-remount til en ny lick-henting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, lickProp])

  // Reflect practice state back into the URL (after the initial load applied it).
  const syncedRef = useRef(false)
  useEffect(() => {
    if (!syncedRef.current) return
    const qs = buildShare({ key: targetKey, bpm, hand })
    const extra = listCtx ? `&${listCtx.kind}=${listCtx.id}&i=${listCtx.index}` : ''
    window.history.replaceState(null, '', `${window.location.pathname}?${qs}${extra}`)
  }, [targetKey, bpm, hand, listCtx])

  // Install the iOS audio unlock on mount; dispose the engine on leave. Also
  // hydrate the user's metronome/count-in *defaults* into usePlayer here — once
  // per app session (module-guarded in store.ts), so a lick opens pre-armed the
  // way the player set it in /innstillinger. The TransportBar toggles stay
  // ephemeral and can override for this session without writing back.
  useEffect(() => {
    installAudioUnlock()
    hydratePracticeDefaults()
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
      // Samme utledning som loop-effekten under (én regel, to lesere: her er det
      // bare byggets STARTVERDI — effekten er den eneste som SKRIVER siden).
      loop: loopRef.current || abLoop || bandMode,
      swing: swingRef.current,
      // Siden eier lyden (D5b), så den følger med bygget. Uten dette kunne denne
      // effekten kjøre FØR lyd-effekten under ved liste-navigasjon piano→gitar.
      instrument: pageInstrumentRef.current,
    })
    if (wasPlaying) void engine.play()
  }, [lick, targetKey, playbackHand, abLoop, bandMode])

  // Keep the engine's A-B loop range in sync with the UI (live, no rebuild).
  useEffect(() => {
    getEngine().setLoopRange(abLoop ? loopA : null, abLoop ? loopB : null)
  }, [abLoop, loopA, loopB])

  // ÉN skriver av loop-tilstanden. Tre brytere kan slå den på (loop-knappen,
  // A-B-loop og band-modus), og den utledes HER — knappene rører bare React-
  // state. Tidligere skrev onLoopToggle rett i motoren mens rebuild-effekten
  // utledet noe annet, så motoren og UI-et kunne bli uenige.
  useEffect(() => {
    getEngine().setLoop(loop || abLoop || bandMode)
  }, [loop, abLoop, bandMode])

  // Side-lokal lyd (D5b), del 1: marker at siden eier lyden mens den lever
  // (AppShells globale speiling holder seg unna da), og gjenopprett det globale
  // session-instrumentet ved unmount. Egen mount-effekt — hvis dette lå som
  // cleanup på pageInstrument, ville hvert lyd-bytte på siden først bygge
  // sesjons-instrumentet i et blaff.
  useEffect(() => {
    const engine = getEngine()
    engine.pageOverrideActive = true
    return () => {
      engine.pageOverrideActive = false
      engine.setInstrument(useSession.getState().instrument)
    }
  }, [])

  // Del 2: speil valget inn i motoren — et gitar-lick spiller gitar automatisk
  // uten å endre brukerens globale valg.
  useEffect(() => {
    getEngine().setInstrument(pageInstrument)
  }, [pageInstrument])

  const notesForKeyboard = useMemo(
    () =>
      lick ? transposedPlayableNotes(lick, targetKey).filter((n) => playbackHand === 'both' || n.h === playbackHand) : [],
    [lick, targetKey, playbackHand],
  )
  const notesAll = useMemo(() => (lick ? transposedPlayableNotes(lick, targetKey) : []), [lick, targetKey])
  // Dagens økt: slug-lista leses fra localStorage + JSON.parse. Den lå i
  // render-kroppen, som under avspilling betyr ~60 synkrone lesninger i sekundet
  // (currentBeat re-rendrer siden per frame). Memoisert på listCtx — den er det
  // eneste som kan endre svaret mens siden lever.
  const dailySlugs = useMemo(
    () => (listCtx?.kind === 'daily' ? getDailySessionSlugs(todayKey()) : []),
    [listCtx],
  )
  const chords = useMemo(() => (lick ? transposedChords(lick, targetKey) : []), [lick, targetKey])

  // Wait-mode trainer (input-gated step-through, MIDI or click).
  const onTrainerLoop = useCallback(() => recordPractice(slug, bpmRef.current), [slug])
  const waitMode = useWaitMode(notesForKeyboard, onTrainerLoop)
  const inputRef = useRef(waitMode.input)
  inputRef.current = waitMode.input
  // Stabil identitet gjennom ref-en, slik at det memoiserte gripebrettet/
  // klaviaturet ikke må bygges om bare fordi Practice rendret på nytt.
  const onInput = useCallback((midi: number) => inputRef.current(midi), [])

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

  // Loop-boundary detection (auto mode): record progress + ramp tempo. Selve
  // deteksjonen (som må se hver beat) bor i <LoopBoundaryWatcher> nederst i
  // fila — den rendrer null, så tikkene koster ingen DOM her.
  const rampRef = useRef(ramp)
  rampRef.current = ramp
  const onLoopBoundary = useCallback(() => {
    // Fremgangs-skrivingen leser + skriver HELE progress-bloben synkront i
    // localStorage, og loop-wrappen er nøyaktig den rammen der Transport
    // starter forfra. Utsett den til etter rammen (ledig tid om nettleseren
    // tilbyr det) — semantikken er uendret: én skriving per wrap.
    deferOffFrame(() => recordPractice(slug, bpmRef.current))
    if (rampRef.current && bpmRef.current < 180) {
      const nb = Math.min(180, bpmRef.current + 4)
      setBpm(nb)
      getEngine().setTempo(nb)
    }
  }, [slug])

  // MIDI cleanup on unmount.
  useEffect(() => () => midi?.dispose(), [midi])

  // Single "Tilbake" affordance: prefer a real browser back-navigation when we
  // can tell the previous page was inside the app (same-origin referrer) —
  // this returns you to wherever you actually came from (a list, a course, a
  // search). Otherwise fall back to a deterministic, context-correct link: the
  // reel browse-default (`/bla`) for a plain lick (reel is now the browse
  // entry point — see modes.ts), the course index (`/kurs`) for a path, or the
  // specific practice list via `/ove?list=<id>` — which OveView reads to reopen
  // that list (see its mount restore), so the list fallback is a real deep link.
  const backHref = listCtx
    ? listCtx.kind === 'daily'
      ? '/'
      : listCtx.kind === 'path'
        ? '/kurs'
        : `/ove?list=${listCtx.id}`
    : '/bla'
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

  // Fretted-lick? Styrer hero-bytte (gripebrett↔klaviatur), view-toggle (TAB|Rull)
  // og øvemodus-copy (D3/D4/D6/BD8). `gitar` beholdes for det gitar-spesifikke
  // (Grep-panel + stemme-labels); `bass` er 4-strengs og enstemmig (BD6/BD7).
  const gitar = (lick.instrument ?? 'piano') === 'gitar'
  const bass = (lick.instrument ?? 'piano') === 'bass'
  const fretted = gitar || bass

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
  // Bare React-state — effekten over utleder og skriver til motoren.
  const onLoopToggle = () => setLoop((v) => !v)
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
      ? { name: 'Dagens økt', slugs: dailySlugs }
      : listCtx.kind === 'path'
        ? (CURATED_PATHS.find((p) => p.id === listCtx.id) ?? null)
        : (lists.find((l) => l.id === listCtx.id) ?? null)
    : null
  const goTo = (idx: number) => {
    if (!navList || !listCtx) return
    const s = navList.slugs[idx]
    if (s) router.push(`/lick/${s}?${listCtx.kind}=${listCtx.id}&i=${idx}`)
  }

  // Chord-tone overlay: regnes ut inne i <LiveHero>, som eier avspillingshodet
  // (og memoiserer settet på AKKORDEN, ikke på slaget).

  // Whether any advanced tool is currently engaged — surfaced as a dot on the
  // "Flere verktøy" toggle so a collapsed panel never hides an active state
  // from the player.
  const advancedActive = abLoop || practiceOn || bandMode || showOverlay

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
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
        <LoopBoundaryWatcher isPlaying={isPlaying} onLoopBoundary={onLoopBoundary} />
        <LiveHero
          fretted={fretted}
          tuning={bass ? BASS_EADG : GUITAR_STANDARD}
          notes={notesForKeyboard}
          allNotes={notesAll}
          hand={playbackHand}
          chords={chords}
          showOverlay={showOverlay}
          practiceOn={practiceOn}
          isPlaying={isPlaying}
          expected={practiceOn ? waitMode.expected : undefined}
          feedback={practiceOn ? waitMode.feedback : undefined}
          onPress={onInput}
        />
        <LiveChordStrip chords={chords} practiceOn={practiceOn} />

        {/* Grep-panel (D7) — kun for gitar-licks med akkorder */}
        {gitar && chords.length > 0 && <GrepPanel chords={chords} />}

        {/* Primær: view-veksling — fretted: TAB|Rull, piano: Pianorull|Noter */}
        <div className="flex gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1 self-start">
          {fretted ? (
            <>
              <ViewTab active={view === 'tab'} onClick={() => setView('tab')} icon={<Guitar className="h-4 w-4" />}>
                TAB
              </ViewTab>
              <ViewTab active={view === 'roll'} onClick={() => setView('roll')} icon={<BarChart3 className="h-4 w-4" />}>
                Rull
              </ViewTab>
            </>
          ) : (
            <>
              <ViewTab active={view === 'roll'} onClick={() => setView('roll')} icon={<BarChart3 className="h-4 w-4" />}>
                Pianorull
              </ViewTab>
              <ViewTab active={view === 'notation'} onClick={() => setView('notation')} icon={<Music className="h-4 w-4" />}>
                Noter
              </ViewTab>
            </>
          )}
        </div>

        {view === 'tab' ? (
          <Tab notes={notesAll} beats={lick.beats} strings={bass ? 4 : 6} />
        ) : view === 'roll' ? (
          <LivePianoRoll
            notes={notesAll}
            hand={playbackHand}
            beats={lick.beats}
            practiceOn={practiceOn}
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
          instrument={pageInstrument}
          onInstrument={setPageInstrument}
          voiceLabels={gitar}
          showHand={!bass}
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
                    {/* Band-modus krever to stemmer — skjult for bass (enstemmig, BD7). */}
                    {!bass && (
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
                    )}
                    {bandMode && (
                      <button
                        onClick={() => setBackingHand((h) => (h === 'L' ? 'R' : 'L'))}
                        className="rounded-full border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-ivory)]"
                      >
                        {gitar
                          ? `App spiller: ${backingHand === 'L' ? 'bass' : 'melodi'}`
                          : `App spiller: ${backingHand === 'L' ? 'venstre' : 'høyre'} hånd`}
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
                    Spill de <span className="text-[var(--color-amber)]">markerte</span>{' '}
                    {fretted ? 'båndene' : 'tangentene'} i rekkefølge
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

// ── Løvkomponenter for avspillingshodet (60 Hz) ──────────────────────────────
// Alt som må se `currentBeat` bor her nede, én abonnent per forbruker. Practice
// selv abonnerer IKKE, så resten av siden (header, transport, verktøypanel …)
// rendres bare når noe faktisk endrer seg — ikke 60 ganger i sekundet. Samme
// isolasjonsmønster som <LiveRoll> i app/bla/ReelCard.tsx.

/**
 * Loop-grense-deteksjon. Rendrer null: den finnes bare for å se hver beat uten
 * å dra resten av treet med seg. Logikken er uendret — et hopp bakover i
 * beat-tallet betyr at loopen startet på nytt.
 */
function LoopBoundaryWatcher({
  isPlaying,
  onLoopBoundary,
}: {
  isPlaying: boolean
  onLoopBoundary: () => void
}) {
  const currentBeat = usePlayer((s) => s.currentBeat)
  const prevBeatRef = useRef(0)
  const onLoopRef = useRef(onLoopBoundary)
  onLoopRef.current = onLoopBoundary
  useEffect(() => {
    if (!isPlaying) {
      prevBeatRef.current = currentBeat
      return
    }
    if (currentBeat < prevBeatRef.current - 0.5) onLoopRef.current()
    prevBeatRef.current = currentBeat
  }, [currentBeat, isPlaying])
  return null
}

/** Hero-en (gripebrett eller klaviatur) + akkordtone-overlegget. */
function LiveHero({
  fretted,
  tuning,
  notes,
  allNotes,
  hand,
  chords,
  showOverlay,
  practiceOn,
  isPlaying,
  expected,
  feedback,
  onPress,
}: {
  fretted: boolean
  tuning: number[]
  notes: LickNote[]
  chords: LickChord[]
  showOverlay: boolean
  practiceOn: boolean
  isPlaying: boolean
  expected?: Set<number>
  feedback?: Map<number, Feedback>
  onPress: (midi: number) => void
  /** Hele notesettet + stemme-filter — brettet beregner posisjoner på ALT
   * (delt fingering med TAB-en) og tegner bare valgt stemme. */
  allNotes: LickNote[]
  hand: HandFilter
}) {
  const currentBeat = usePlayer((s) => s.currentBeat)
  const beat = practiceOn ? -1 : isPlaying ? currentBeat : 0

  // Akkorden som lyder nå. Referansen er den SAMME gjennom hele akkordens
  // varighet, så useMemo under allokerer ett Set per akkordskifte — ikke ett
  // per frame, slik den gamle IIFE-en i Practice gjorde.
  const chord = showOverlay
    ? (chords.find((ch) => ch.t - 1e-6 <= beat && beat < ch.t + ch.d - 1e-6) ?? chords[0])
    : undefined
  const overlay = useMemo(
    () => (chord ? { root: chord.r, tones: new Set(chordPitchClasses(chord.r, chord.q)) } : undefined),
    [chord],
  )

  return fretted ? (
    <Fretboard
      notes={allNotes}
      hand={hand}
      tuning={tuning}
      currentBeat={beat}
      expected={expected}
      feedback={feedback}
      overlay={overlay}
      onPress={onPress}
    />
  ) : (
    <Keyboard
      notes={notes}
      currentBeat={beat}
      expected={expected}
      feedback={feedback}
      overlay={overlay}
      onKeyPress={onPress}
    />
  )
}

/** Akkordstripa — markerer akkorden som lyder. */
function LiveChordStrip({ chords, practiceOn }: { chords: LickChord[]; practiceOn: boolean }) {
  const currentBeat = usePlayer((s) => s.currentBeat)
  return <ChordStrip chords={chords} currentBeat={practiceOn ? -1 : currentBeat} />
}

/** Pianorullen — bare avspillingslinja flytter seg (PianoRoll memoiserer resten). */
function LivePianoRoll({
  notes,
  hand,
  beats,
  practiceOn,
  loopRange,
}: {
  notes: LickNote[]
  hand: HandFilter
  beats: number
  practiceOn: boolean
  loopRange: { a: number; b: number } | null
}) {
  const currentBeat = usePlayer((s) => s.currentBeat)
  return (
    <PianoRoll
      notes={notes}
      hand={hand}
      beats={beats}
      currentBeat={practiceOn ? -1 : currentBeat}
      loopRange={loopRange}
    />
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
