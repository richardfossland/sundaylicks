'use client'

import { useEffect, useRef, useState } from 'react'
import { Renderer, TabStave, TabNote, GhostNote, Voice, Formatter, Tuplet } from 'vexflow'
import type { LickNote } from '@/types/lick'
import { buildTabNotes } from '@/lib/tab'
import { BASS_EADG, GUITAR_STANDARD } from '@/lib/guitar/fretting'

const IVORY = '#F3EAD9'

interface Props {
  notes: LickNote[] // transponert, alle strenger
  beats: number
  /** Antall TAB-linjer: 6 = gitar (default), 4 = bass. Bestemmer num_lines +
   * hvilken stemming fretPositions bruker (BD5). */
  strings?: number
}

// Fretted-tabulatur via VexFlow: én TabStave (num_lines = strings), TabNote-er
// bygget fra de rene TabEvent-beskrivelsene (buildTabNotes), pauser som GhostNote
// (kun spacing), non-strict stemme. 6-strengs gitar (default) og 4-strengs bass
// deler samme kode. Farger rekolores til scene-elfenben som Notation.tsx.
export function Tab({ notes, beats, strings = 6 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const host = ref.current
    if (!host) return
    host.innerHTML = ''
    setError(false)

    try {
      const width = Math.max(340, 90 + beats * 62)
      const height = 160
      const renderer = new Renderer(host, Renderer.Backends.SVG)
      renderer.resize(width, height)
      const ctx = renderer.getContext()

      const tuning = strings === 4 ? BASS_EADG : GUITAR_STANDARD
      const staveW = width - 20
      const stave = new TabStave(10, 20, staveW, { num_lines: strings }).addClef('tab')
      stave.setContext(ctx).draw()

      const { events, tuplets } = buildTabNotes(notes, beats, strings, tuning)
      const tickables = events.map((e) =>
        e.rest ? new GhostNote(e.duration) : new TabNote({ positions: e.positions, duration: e.duration }),
      )
      const tupletObjs = tuplets.map((group) => new Tuplet(group.map((i) => tickables[i])))

      const v = new Voice({ num_beats: beats, beat_value: 4 }).setStrict(false)
      v.addTickables(tickables)
      new Formatter().joinVoices([v]).format([v], staveW - 40)
      v.draw(ctx, stave)
      tupletObjs.forEach((t) => t.setContext(ctx).draw())

      // Rekolorer for den mørke scenen (VexFlow tegner svart som standard).
      host.querySelectorAll<SVGElement>('svg path, svg text, svg rect, svg g').forEach((el) => {
        const f = el.getAttribute('fill')
        if (f !== 'none') el.setAttribute('fill', IVORY)
        const s = el.getAttribute('stroke')
        if (s && s !== 'none') el.setAttribute('stroke', IVORY)
      })
    } catch {
      setError(true)
    }
  }, [notes, beats, strings])

  return (
    <div className="scroll-x rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
      {error && (
        <p className="px-2 py-6 text-center text-sm text-[var(--color-muted)]">
          Kunne ikke tegne tabulatur for denne licken.
        </p>
      )}
      <div ref={ref} className={error ? 'hidden' : ''} />
    </div>
  )
}
