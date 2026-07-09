'use client'

// Avspillingslim mellom demo-dataen (Tone-fri) og den globale motoren. Denne
// fila (og alt den drar inn: playback.ts → Tone) når KUN klienten via DemoBlock,
// som lastes `dynamic({ ssr:false })` — så det er trygt å importere getEngine her.
//
// Kontrakt:
//   • playChord — spill et grep: én engine.playNote() per tone (blokk), eller en
//     ~180ms forskutt kjede når `arpeggiate` er satt.
//   • playPhrase — stopp motoren, bygg en bitteliten in-memory Lick (samme form
//     som spice.ts' voicingLick/generatedToLick) og play(). build() nullstiller
//     Transport.swing, så swing lekker aldri mellom A/B-varianter.
//   • Kun ÉN demo spiller om gangen på tvers av alle DemoBlock-instanser: en
//     modul-lokal `activeClear` peker på forrige spillers opprydding og kalles
//     før neste starter (motoren er uansett en singleton).
//   • playingKey nulles når usePlayer.isPlaying flipper (frase) eller via en
//     varighets-timer (grep, som ikke rører isPlaying). stop() ved unmount.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lick } from '@/types/lick'
import { getEngine } from '@/lib/playback'
import { usePlayer } from '@/lib/store'
import type { DemoChord, DemoPhrase } from '@/data/glossary-demos'

// Modul-lokal: opprydding for demoen som spiller akkurat nå (én på tvers av appen).
let activeClear: (() => void) | null = null

const ARP_STAGGER_MS = 180

/** Bygg en spillbar Lick av en demo-frase (DB-feltene er syntetiske). */
function phraseToLick(phrase: DemoPhrase): Lick {
  return {
    id: 'demo',
    slug: 'demo',
    name: 'demo',
    description: null,
    category: 'comp',
    genre: 'gospel',
    difficulty: 1,
    original_key: 0,
    default_bpm: phrase.bpm ?? 90,
    beats: phrase.beats,
    time_signature: '4/4',
    notes: phrase.notes.map((n) => ({ p: n.p, t: n.t, d: n.d, h: n.h ?? 'R', v: n.v ?? 0.8 })),
    chords: (phrase.chords ?? []).map((c) => ({ t: c.t, d: c.d, r: c.r, q: c.q, b: c.b })),
    tags: [],
    status: 'published',
    kind: 'transition',
  }
}

export interface DemoPlayer {
  playChord: (key: string, chord: DemoChord) => void
  playPhrase: (key: string, phrase: DemoPhrase) => void
  playKey: (midi: number) => void
  stop: () => void
  playingKey: string | null
  isLoading: boolean
}

export function useDemoPlayer(): DemoPlayer {
  const [playingKey, setPlayingKey] = useState<string | null>(null)
  const isLoading = usePlayer((s) => s.isLoading)

  const chordTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phraseActive = useRef(false)

  // Stabil lokal opprydding — refet slik at modul-registeret kan sammenligne
  // identitet uten å re-registrere ved hver render.
  const clearLocal = useRef(() => {})
  clearLocal.current = () => {
    phraseActive.current = false
    if (chordTimer.current) clearTimeout(chordTimer.current)
    chordTimer.current = null
    setPlayingKey(null)
  }

  // Frase ferdig: motoren setter isPlaying=false (scheduleEnd) → nulls playingKey.
  useEffect(() => {
    const unsub = usePlayer.subscribe((state, prev) => {
      if (phraseActive.current && prev.isPlaying && !state.isPlaying) {
        phraseActive.current = false
        setPlayingKey(null)
      }
    })
    return unsub
  }, [])

  // Rydd opp ved unmount (rute-bytte / kollaps av oppføring).
  useEffect(() => {
    return () => {
      if (activeClear === clearLocal.current) activeClear = null
      if (chordTimer.current) clearTimeout(chordTimer.current)
      getEngine().stop()
    }
  }, [])

  /** Overta som eneste spiller: rydd forrige demo + stopp motoren. */
  const takeOver = useCallback(() => {
    if (activeClear && activeClear !== clearLocal.current) activeClear()
    getEngine().stop()
    phraseActive.current = false
    if (chordTimer.current) clearTimeout(chordTimer.current)
    chordTimer.current = null
    activeClear = clearLocal.current
  }, [])

  const playChord = useCallback(
    (key: string, chord: DemoChord) => {
      takeOver()
      setPlayingKey(key)
      const engine = getEngine()
      const stagger = chord.arpeggiate ? ARP_STAGGER_MS : 0
      const dur = chord.arpeggiate ? 0.7 : 1.4
      chord.pitches.forEach((p, i) => {
        if (stagger === 0) void engine.playNote(p, 0.82, dur)
        else setTimeout(() => void engine.playNote(p, 0.82, dur), i * stagger)
      })
      const total = stagger * chord.pitches.length + dur * 1000 + 200
      chordTimer.current = setTimeout(() => {
        if (activeClear === clearLocal.current) activeClear = null
        setPlayingKey(null)
      }, total)
    },
    [takeOver],
  )

  const playPhrase = useCallback(
    (key: string, phrase: DemoPhrase) => {
      takeOver()
      const engine = getEngine()
      engine.build(phraseToLick(phrase), {
        targetKey: 0,
        hand: 'both',
        bpm: phrase.bpm ?? 90,
        loop: false,
        swing: phrase.swing,
      })
      phraseActive.current = true
      setPlayingKey(key)
      void engine.play()
    },
    [takeOver],
  )

  const playKey = useCallback((midi: number) => {
    void getEngine().playNote(midi, 0.85, 0.8)
  }, [])

  const stop = useCallback(() => {
    if (activeClear === clearLocal.current) activeClear = null
    getEngine().stop()
    clearLocal.current()
  }, [])

  return { playChord, playPhrase, playKey, stop, playingKey, isLoading }
}
