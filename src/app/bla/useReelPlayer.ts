'use client'

// All Tone-touching logic for the reel lives here, so BlaView / ReelCard stay
// Tone-free (sibling pattern to glossary/useDemoPlayer). The engine is the app's
// single global playback singleton, so the contract is strict about hygiene:
//
//   • stop-before-play EVERYWHERE — a new active card always silences the old
//     one first, so at most one lick ever sounds.
//   • Autoplay is DEBOUNCED (300ms): flinging past ten cards must not fire ten
//     builds/plays — only the card you settle on plays.
//   • Autoplay is gated on `autoplay && soundReady && enabled && !document.hidden`.
//     soundReady is true once the AudioContext is running (already unlocked) or
//     after the first user gesture anywhere on the page — browsers refuse audio
//     before that, and iOS additionally needs installAudioUnlock()'s handling.
//   • Playback stops when the tab is hidden, and the engine is disposed on
//     unmount (route change) so no Transport/RAF loop leaks.

import { useCallback, useEffect, useState } from 'react'
import * as Tone from 'tone'
import type { Lick } from '@/types/lick'
import { getEngine } from '@/lib/playback'
import { usePlayer } from '@/lib/store'
import { installAudioUnlock } from '@/lib/audio-unlock'

/** ms of quiet after the active card settles before autoplay fires. */
const AUTOPLAY_DEBOUNCE_MS = 300

interface Options {
  /** The currently-active lick (null while the reel is still loading). */
  lick: Lick | null
  /** Pitch class 0–11 to transpose into — the player's session key. */
  targetKey: number
  /** User toggle: autoplay the active card on settle. */
  autoplay: boolean
  /** Gate everything until the reel has real data mounted. */
  enabled: boolean
}

export interface ReelPlayer {
  /** False until audio is unlocked; the active card prompts the user to tap. */
  soundReady: boolean
  /** Manually (re)play the active card from the top — always allowed. */
  replay: () => void
  /** Sampler still fetching (first play) — drives the replay-button spinner. */
  isLoading: boolean
}

export function useReelPlayer({ lick, targetKey, autoplay, enabled }: Options): ReelPlayer {
  const [soundReady, setSoundReady] = useState(false)
  const isLoading = usePlayer((s) => s.isLoading)

  // Install the iOS/gesture unlock once, and learn WHEN audio becomes usable:
  // either the context is already running, or the first gesture flips us ready.
  useEffect(() => {
    installAudioUnlock()
    if (Tone.getContext().state === 'running') {
      setSoundReady(true)
      return
    }
    const events = ['pointerdown', 'keydown', 'touchend']
    const onGesture = () => {
      setSoundReady(true)
      events.forEach((e) => window.removeEventListener(e, onGesture))
    }
    events.forEach((e) => window.addEventListener(e, onGesture, { passive: true }))
    return () => events.forEach((e) => window.removeEventListener(e, onGesture))
  }, [])

  // Autoplay on active-card change. Stop immediately on every run (so switching
  // cards is silent instantly), then — only when fully gated in — schedule a
  // debounced build+play. loop:false auto-stops via the engine's scheduleEnd.
  useEffect(() => {
    const engine = getEngine()
    engine.stop()
    if (!enabled || !autoplay || !soundReady || !lick) return
    if (typeof document !== 'undefined' && document.hidden) return

    const timer = setTimeout(() => {
      engine.build(lick, { targetKey, hand: 'both', bpm: lick.default_bpm, loop: false })
      void engine.play()
    }, AUTOPLAY_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      engine.stop()
    }
  }, [lick, targetKey, autoplay, soundReady, enabled])

  // Pause when the tab is hidden (a scheduled play mid-flight would sound the
  // moment the user returns to a different app otherwise).
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) getEngine().stop()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Tear the engine down on route change.
  useEffect(() => {
    return () => {
      getEngine().dispose()
    }
  }, [])

  const replay = useCallback(() => {
    if (!lick) return
    const engine = getEngine()
    engine.stop()
    engine.build(lick, { targetKey, hand: 'both', bpm: lick.default_bpm, loop: false })
    void engine.play()
  }, [lick, targetKey])

  return { soundReady, replay, isLoading }
}
