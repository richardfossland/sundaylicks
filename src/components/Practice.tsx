'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Lick, HandFilter } from '@/types/lick'
import { fetchLick } from '@/lib/licks'
import { transposedNotes, transposedChords } from '@/lib/transpose'
import { getEngine } from '@/lib/playback'
import { usePlayer } from '@/lib/store'
import { KEY_NAMES } from '@/lib/music'
import { CATEGORY_LABEL, DIFFICULTY_LABEL, difficultyDots } from '@/lib/labels'
import { Keyboard } from './Keyboard'
import { PianoRoll } from './PianoRoll'
import { ChordStrip } from './ChordStrip'
import { TransportBar } from './TransportBar'

export function Practice({ slug }: { slug: string }) {
  const [lick, setLick] = useState<Lick | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [targetKey, setTargetKey] = useState(0)
  const [bpm, setBpm] = useState(80)
  const [hand, setHand] = useState<HandFilter>('both')
  const [loop, setLoop] = useState(true)

  const isPlaying = usePlayer((s) => s.isPlaying)
  const isLoading = usePlayer((s) => s.isLoading)
  const currentBeat = usePlayer((s) => s.currentBeat)

  // Live values the rebuild effect reads without re-triggering on their change.
  const bpmRef = useRef(bpm)
  bpmRef.current = bpm
  const loopRef = useRef(loop)
  loopRef.current = loop

  // Load the lick once.
  useEffect(() => {
    let alive = true
    fetchLick(slug).then((l) => {
      if (!alive) return
      if (!l) return setNotFound(true)
      setLick(l)
      setTargetKey(l.original_key)
      setBpm(l.default_bpm)
    })
    return () => {
      alive = false
    }
  }, [slug])

  // Dispose the audio engine when leaving the page.
  useEffect(() => () => getEngine().dispose(), [])

  // (Re)build the Tone part whenever the notes change (lick / key / hand).
  // Tempo and loop change live and do NOT rebuild.
  useEffect(() => {
    if (!lick) return
    const engine = getEngine()
    const wasPlaying = usePlayer.getState().isPlaying
    if (wasPlaying) engine.stop() // key/hand change restarts from the top
    engine.build(lick, { targetKey, hand, bpm: bpmRef.current, loop: loopRef.current })
    if (wasPlaying) void engine.play()
  }, [lick, targetKey, hand])

  const notesForKeyboard = useMemo(
    () => (lick ? transposedNotes(lick, targetKey).filter((n) => hand === 'both' || n.h === hand) : []),
    [lick, targetKey, hand],
  )
  const notesAll = useMemo(() => (lick ? transposedNotes(lick, targetKey) : []), [lick, targetKey])
  const chords = useMemo(() => (lick ? transposedChords(lick, targetKey) : []), [lick, targetKey])

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
    if (usePlayer.getState().isPlaying) engine.stop()
    else void engine.play()
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

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ivory)]"
      >
        <ArrowLeft className="h-4 w-4" /> Biblioteket
      </Link>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-muted)]">
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
        <Keyboard notes={notesForKeyboard} currentBeat={isPlaying ? currentBeat : 0} />
        <ChordStrip chords={chords} beats={lick.beats} currentBeat={currentBeat} />
        <PianoRoll notes={notesAll} hand={hand} beats={lick.beats} currentBeat={currentBeat} />
        <TransportBar
          isPlaying={isPlaying}
          isLoading={isLoading}
          onPlayToggle={onPlayToggle}
          loop={loop}
          onLoopToggle={onLoopToggle}
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
