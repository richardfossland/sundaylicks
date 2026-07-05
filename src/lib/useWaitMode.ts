'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LickNote } from '@/types/lick'
import { getEngine } from './playback'

// Wait-mode trainer: step through a lick's note-onsets, advancing only when the
// player hits the expected note(s). Input comes from Web MIDI OR clicking the
// on-screen keyboard — the same pipeline — so it works with or without hardware.
// PLAN §4/§6 Fase 3.

export type Feedback = 'hit' | 'miss'

export interface WaitMode {
  active: boolean
  step: number
  total: number
  expected: Set<number> // pitches to play at the current step
  feedback: Map<number, Feedback>
  start: () => void
  stop: () => void
  input: (midi: number) => void
}

function buildSteps(notes: LickNote[]): Set<number>[] {
  const map = new Map<number, Set<number>>()
  for (const n of notes) {
    const key = Math.round(n.t * 1000)
    if (!map.has(key)) map.set(key, new Set())
    map.get(key)!.add(n.p)
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, s]) => s)
}

export function useWaitMode(notes: LickNote[], onLoopComplete?: () => void): WaitMode {
  const steps = useMemo(() => buildSteps(notes), [notes])
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [feedback, setFeedback] = useState<Map<number, Feedback>>(new Map())

  const hitsRef = useRef<Set<number>>(new Set())
  const stepsRef = useRef(steps)
  stepsRef.current = steps
  const stepRef = useRef(0)
  stepRef.current = step
  const activeRef = useRef(false)
  activeRef.current = active
  const onLoopRef = useRef(onLoopComplete)
  onLoopRef.current = onLoopComplete
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  // Reset when the lick/key/hand changes.
  useEffect(() => {
    setStep(0)
    hitsRef.current = new Set()
  }, [steps])

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
    },
    [],
  )

  const flash = useCallback((midi: number, kind: Feedback) => {
    setFeedback((prev) => {
      const next = new Map(prev)
      next.set(midi, kind)
      return next
    })
    const t = setTimeout(() => {
      setFeedback((prev) => {
        const next = new Map(prev)
        next.delete(midi)
        return next
      })
    }, 280)
    timers.current.push(t)
  }, [])

  const start = useCallback(() => {
    hitsRef.current = new Set()
    setStep(0)
    setActive(true)
  }, [])

  const stop = useCallback(() => {
    setActive(false)
    hitsRef.current = new Set()
    setFeedback(new Map())
  }, [])

  const input = useCallback(
    (midi: number) => {
      if (!activeRef.current) {
        void getEngine().playNote(midi)
        return
      }
      const expected = stepsRef.current[stepRef.current]
      if (!expected) return
      if (expected.has(midi)) {
        void getEngine().playNote(midi)
        flash(midi, 'hit')
        hitsRef.current.add(midi)
        // All expected notes for this step hit → advance.
        if ([...expected].every((p) => hitsRef.current.has(p))) {
          hitsRef.current = new Set()
          const nextStep = stepRef.current + 1
          if (nextStep >= stepsRef.current.length) {
            setStep(0)
            onLoopRef.current?.()
          } else {
            setStep(nextStep)
          }
        }
      } else {
        flash(midi, 'miss')
      }
    },
    [flash],
  )

  const expected = active ? (steps[step] ?? new Set<number>()) : new Set<number>()

  return { active, step, total: steps.length, expected, feedback, start, stop, input }
}
