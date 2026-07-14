'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Guitar } from 'lucide-react'
import type { LickChord } from '@/types/lick'
import { chordLabel } from '@/lib/music'
import { shapesFor } from '@/lib/guitar/chord-shapes'
import { ChordDiagram } from './ChordDiagram'
import { cn } from '@/lib/cn'

// ── Grep-panel (D7) ──────────────────────────────────────────────────────────
// For gitar-licks: en kollapsbar rad med akkordgrep-diagrammer. Vi tar de unike
// (rot, kvalitet)-parene fra de transponerte akkordene i rekkefølge, slår opp
// det mest åpne grepet (shapesFor(...)[0]) og tegner et ChordDiagram per grep.
// Akkorder uten et spillbart grep (dim/aug/…) hoppes stille over. Panelet er
// åpent som standard — grepene er selve poenget for et komp-lick.

interface Props {
  /** Allerede transponerte akkorder (røttene er pitch-klasser). */
  chords: LickChord[]
}

export function GrepPanel({ chords }: Props) {
  const [open, setOpen] = useState(true)

  // Unike (r,q) i rekkefølge → første (mest åpne) grep; hopp over tomme.
  const grips = useMemo(() => {
    const seen = new Set<string>()
    const out: { key: string; label: string; shape: ReturnType<typeof shapesFor>[number] }[] = []
    for (const c of chords) {
      const key = `${c.r}:${c.q}`
      if (seen.has(key)) continue
      seen.add(key)
      const shape = shapesFor(c.r, c.q)[0]
      if (!shape) continue
      out.push({ key, label: chordLabel(c.r, c.q), shape })
    }
    return out
  }, [chords])

  if (grips.length === 0) return null

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-sm font-medium text-[var(--color-ivory)]"
      >
        <Guitar className="h-4 w-4 text-[var(--color-amber)]" />
        Grep
        <span className="text-[var(--color-muted)]">({grips.length})</span>
        <ChevronDown className={cn('ml-auto h-4 w-4 text-[var(--color-muted)] transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="scroll-x mt-3 pb-1">
          <div className="flex items-start gap-4" style={{ minWidth: 'min-content' }}>
            {grips.map((g) => (
              <ChordDiagram key={g.key} shape={g.shape} label={g.label} width={96} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
