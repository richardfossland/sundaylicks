'use client'

import { useEffect, useRef, useState } from 'react'
import { Renderer, Stave, Voice, Formatter, StaveConnector, Tuplet } from 'vexflow'
import type { LickNote } from '@/types/lick'
import { buildStaveNotes } from '@/lib/notation'

const IVORY = '#F3EAD9'

interface Props {
  notes: LickNote[] // transposed, both hands
  beats: number
  timeSignature: string
}

export function Notation({ notes, beats, timeSignature }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const host = ref.current
    if (!host) return
    host.innerHTML = ''
    setError(false)

    try {
      const width = Math.max(340, 90 + beats * 62)
      const height = 230
      const renderer = new Renderer(host, Renderer.Backends.SVG)
      renderer.resize(width, height)
      const ctx = renderer.getContext()

      const staveW = width - 20
      const treble = new Stave(10, 10, staveW).addClef('treble').addTimeSignature(timeSignature)
      const bass = new Stave(10, 110, staveW).addClef('bass').addTimeSignature(timeSignature)
      treble.setContext(ctx).draw()
      bass.setContext(ctx).draw()
      new StaveConnector(treble, bass).setType('brace').setContext(ctx).draw()
      new StaveConnector(treble, bass).setType('singleLeft').setContext(ctx).draw()

      const mkVoice = (hand: 'R' | 'L', stave: Stave) => {
        const { notes: staveNotes, tuplets } = buildStaveNotes(notes, hand, beats)
        const tupletObjs = tuplets.map((g) => new Tuplet(g))
        const v = new Voice({ num_beats: beats, beat_value: 4 }).setStrict(false)
        v.addTickables(staveNotes)
        new Formatter().joinVoices([v]).format([v], staveW - 60)
        v.draw(ctx, stave)
        tupletObjs.forEach((t) => t.setContext(ctx).draw())
      }
      mkVoice('R', treble)
      mkVoice('L', bass)

      // Recolor everything for the dark scene (VexFlow draws black by default,
      // and leaves many glyphs to inherit — so fill in even when the attribute
      // is absent, but never override an explicit fill:none, e.g. tuplet brackets).
      host.querySelectorAll<SVGElement>('svg path, svg text, svg rect, svg g').forEach((el) => {
        const f = el.getAttribute('fill')
        if (f !== 'none') el.setAttribute('fill', IVORY)
        const s = el.getAttribute('stroke')
        if (s && s !== 'none') el.setAttribute('stroke', IVORY)
      })
    } catch {
      setError(true)
    }
  }, [notes, beats, timeSignature])

  return (
    <div className="scroll-x rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
      {error && (
        <p className="px-2 py-6 text-center text-sm text-[var(--color-muted)]">
          Kunne ikke tegne noter for denne licken.
        </p>
      )}
      <div ref={ref} className={error ? 'hidden' : ''} />
    </div>
  )
}
