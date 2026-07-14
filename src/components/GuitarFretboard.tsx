'use client'

import { useMemo } from 'react'
import type { LickNote, Hand } from '@/types/lick'
import type { Feedback } from '@/lib/useWaitMode'
import {
  GUITAR_STANDARD,
  MAX_FRET,
  bestPosition,
  fretboardLayout,
  fretPositions,
  type FretPosition,
} from '@/lib/guitar/fretting'
import { pitchClass, noteName } from '@/lib/music'

// ── GuitarFretboard — det interaktive gripebrettet (gitar-søskenet til Keyboard) ──
// Strenger tegnes vannrett (lav E NEDERST, per fretting-geometrien), bånd 0–15 er
// klikkbare celler: å trykke streng+bånd spiller den tonehøyden gjennom kallerens
// input-pipeline (motorens gitar-sampler + vent-modus-gating), nøyaktig som å
// klikke en pianotangent. Aktive avspillingsposisjoner lyser i stemme-farge
// (melodi/R = amber, bass/L = sea — speiler Keyboard.fillFor); vent-modus-mål har
// amber-omriss; hit/miss blinker grønt/rødt. Akkordtone-overlegget (D4b) legger
// prikker på alle bånd 0–12 med en pitch-klasse i akkorden (rot = amber, øvrige = sea).

const FRETS = 15
const GUTTER = 40 // åpen-streng-stripe til venstre for sadelen (klikk = åpen note)
const BOARD_W = 720
const H = 200
const EPS = 1e-6
const MARKER_FRETS = [3, 5, 7, 9] // enkle prikker; 12 får dobbeltprikk

const HIT = '#6BD08A'
const MISS = '#C7534E'
const EXPECTED = 'var(--color-amber)'

interface Props {
  /** Transponert + håndfiltrert (tonene som faktisk spilles), hver med `s`. */
  notes: LickNote[]
  currentBeat: number
  /** Vent-modus: tonehøyder (MIDI) spilleren skal treffe nå (amber-omriss). */
  expected?: Set<number>
  /** Vent-modus: forbigående hit/miss-tilbakemelding per MIDI-tonehøyde. */
  feedback?: Map<number, Feedback>
  /** Akkordtone-overlegg: rot + toner som pitch-klasser (D4b). */
  overlay?: { root: number; tones: Set<number> }
  /** Spill/rut en note (motorens gitar-sample + vent-modus-input). */
  onPress: (midi: number) => void
}

export function GuitarFretboard({ notes, currentBeat, expected, feedback, overlay, onPress }: Props) {
  const layout = useMemo(() => fretboardLayout(GUITAR_STANDARD, FRETS, BOARD_W, H), [])

  // Spillbare posisjoner for hele det (allerede transponerte) note-settet. offset
  // 0: fretPositions leser `s` + den transponerte `p` og om-fingrer HELE settet
  // deterministisk hvis et utledet bånd faller utenfor 0–15 (D1c).
  const positions = useMemo(() => fretPositions(notes, 0), [notes])

  // Aktive posisjoner ved currentBeat, med stemme (hånd) for fargevalg. Speiler
  // Keyboard: R (melodi) vinner over en overlappende L på samme celle.
  const activeMap = useMemo(() => {
    const m = new Map<string, { hand: Hand; midi: number }>()
    notes.forEach((n, i) => {
      if (n.t - EPS <= currentBeat && currentBeat < n.t + n.d - EPS) {
        const p = positions[i]
        const key = `${p.string}:${p.fret}`
        if (n.h === 'R' || !m.has(key)) m.set(key, { hand: n.h, midi: n.p })
      }
    })
    return m
  }, [notes, positions, currentBeat])

  // Vent-modus-mål: map hver forventet MIDI til en posisjon via lickens `s`
  // (gjenbruk note-posisjonen), fallback til bestPosition etter om-fingring.
  const expectedSet = useMemo(() => {
    const set = new Set<string>()
    if (!expected) return set
    for (const midi of expected) {
      const idx = notes.findIndex((n) => n.p === midi)
      const pos: FretPosition | null =
        idx >= 0 ? positions[idx] : bestPosition(midi, GUITAR_STANDARD, undefined, MAX_FRET)
      if (pos) set.add(`${pos.string}:${pos.fret}`)
    }
    return set
  }, [expected, notes, positions])

  // En celles prikk-senter, i det gutter-forskjøvne koordinatrommet.
  const dotAt = (s: number, f: number) => {
    const { x, y } = layout.posOf(s, f)
    return { cx: f === 0 ? GUTTER / 2 : GUTTER + x, cy: y }
  }

  const cells: { s: number; f: number; midi: number }[] = []
  for (let s = 0; s < GUITAR_STANDARD.length; s++) {
    for (let f = 0; f <= FRETS; f++) cells.push({ s, f, midi: GUITAR_STANDARD[s] + f })
  }

  return (
    <div className="scroll-x rounded-xl border border-[var(--color-border)] bg-[var(--color-raised)] p-3">
      <svg
        viewBox={`0 0 ${GUTTER + BOARD_W} ${H}`}
        className="block h-auto min-w-[560px] select-none"
        role="group"
        aria-label="Gripebrett — klikk på streng og bånd for å spille"
      >
        {/* Sadel + båndlinjer */}
        <line
          x1={GUTTER}
          y1={layout.stringY[GUITAR_STANDARD.length - 1] - 10}
          x2={GUTTER}
          y2={layout.stringY[0] + 10}
          stroke="var(--color-ivory)"
          strokeWidth={4}
        />
        {layout.fretX.slice(1).map((x, i) => (
          <line
            key={i}
            x1={GUTTER + x}
            y1={layout.stringY[GUITAR_STANDARD.length - 1] - 8}
            x2={GUTTER + x}
            y2={layout.stringY[0] + 8}
            stroke="var(--color-border)"
            strokeWidth={2}
          />
        ))}

        {/* Posisjonsmarkører (prikker på 3-5-7-9, dobbel på 12) + båndnummer */}
        {MARKER_FRETS.map((f) => {
          const x = GUTTER + (layout.fretX[f - 1] + layout.fretX[f]) / 2
          return <circle key={f} cx={x} cy={H / 2} r={4} fill="var(--color-border)" />
        })}
        {(() => {
          const x = GUTTER + (layout.fretX[11] + layout.fretX[12]) / 2
          return (
            <g>
              <circle cx={x} cy={H / 2 - 24} r={4} fill="var(--color-border)" />
              <circle cx={x} cy={H / 2 + 24} r={4} fill="var(--color-border)" />
            </g>
          )
        })()}
        {layout.fretX.slice(1).map((x, i) => (
          <text
            key={i}
            x={GUTTER + (layout.fretX[i] + x) / 2}
            y={12}
            textAnchor="middle"
            fontSize={9}
            fill="var(--color-muted)"
          >
            {i + 1}
          </text>
        ))}

        {/* Strenger — tykkere mot lav E, med åpen-streng-etiketter */}
        {GUITAR_STANDARD.map((open, s) => (
          <g key={s}>
            <line
              x1={GUTTER}
              y1={layout.stringY[s]}
              x2={GUTTER + BOARD_W}
              y2={layout.stringY[s]}
              stroke="var(--color-muted)"
              strokeWidth={2.6 - s * 0.3}
            />
            <text
              x={GUTTER / 2}
              y={layout.stringY[s] - 8}
              textAnchor="middle"
              fontSize={10}
              fill="var(--color-muted)"
            >
              {noteName(open).replace(/\d+$/, '')}
            </text>
          </g>
        ))}

        {/* Akkordtone-overlegg (D4b): bånd 0–12, prikk der pitch-klassen er en akkordtone */}
        {overlay &&
          cells.map(({ s, f, midi }) => {
            if (f > 12) return null
            if (!overlay.tones.has(pitchClass(midi))) return null
            const isRoot = pitchClass(midi) === pitchClass(overlay.root)
            const { cx, cy } = dotAt(s, f)
            return (
              <circle
                key={`ov-${s}:${f}`}
                cx={cx}
                cy={cy}
                r={isRoot ? 4.5 : 3.5}
                fill={isRoot ? 'var(--color-amber)' : 'var(--color-sea)'}
                opacity={0.85}
                pointerEvents="none"
              />
            )
          })}

        {/* Tilstandsprikker (under klikklaget): aktiv avspilling, mål, tilbakemelding */}
        {cells.map(({ s, f, midi }) => {
          const key = `${s}:${f}`
          const fb = feedback?.get(midi)
          const isExpected = expectedSet.has(key)
          const act = activeMap.get(key)
          if (!fb && !isExpected && !act) return null
          const { cx, cy } = dotAt(s, f)
          const activeColor = act?.hand === 'L' ? 'var(--color-sea)' : 'var(--color-amber)'
          const fill = fb === 'hit' ? HIT : fb === 'miss' ? MISS : act ? activeColor : 'transparent'
          const labelDark = fb || act
          return (
            <g key={key} pointerEvents="none">
              {(fb || act) && <circle cx={cx} cy={cy} r={11} fill={fill} opacity={0.95} />}
              {isExpected && (
                <circle cx={cx} cy={cy} r={13} fill="none" stroke={EXPECTED} strokeWidth={2.5} />
              )}
              <text
                x={cx}
                y={cy + 3.5}
                textAnchor="middle"
                fontSize={10}
                fontWeight={700}
                fill={labelDark ? 'var(--color-ink-on-amber, #171210)' : EXPECTED}
              >
                {f}
              </text>
            </g>
          )
        })}

        {/* Klikklag — én gjennomsiktig celle per streng × bånd (0 = gutteren) */}
        {cells.map(({ s, f, midi }) => {
          const x0 = f === 0 ? 0 : GUTTER + layout.fretX[f - 1]
          const x1 = f === 0 ? GUTTER : GUTTER + layout.fretX[f]
          const rowH =
            GUITAR_STANDARD.length > 1 ? Math.abs(layout.stringY[0] - layout.stringY[1]) : H
          return (
            <rect
              key={`hit-${s}:${f}`}
              x={x0}
              y={layout.stringY[s] - rowH / 2}
              width={x1 - x0}
              height={rowH}
              fill="transparent"
              className="cursor-pointer"
              role="button"
              aria-label={`${noteName(midi)} — streng ${s + 1}, bånd ${f}`}
              onPointerDown={() => onPress(midi)}
            />
          )
        })}
      </svg>
    </div>
  )
}
