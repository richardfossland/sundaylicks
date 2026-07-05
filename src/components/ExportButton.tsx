'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, FileMusic, Printer } from 'lucide-react'
import type { Lick } from '@/types/lick'
import { downloadMidi } from '@/lib/midi-export'
import { printLickSheet } from '@/lib/pdf-export'

export function ExportButton({ lick, targetKey, bpm }: { lick: Lick; targetKey: number; bpm: number }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const item = 'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[var(--color-ivory)] hover:bg-[var(--color-surface)]'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-ivory)]"
      >
        <Download className="h-4 w-4" /> Eksport
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-raised)] p-1.5 shadow-xl">
          <button
            className={item}
            onClick={() => {
              downloadMidi(lick, targetKey, bpm)
              setOpen(false)
            }}
          >
            <FileMusic className="h-4 w-4 text-[var(--color-amber)]" /> Last ned MIDI (.mid)
          </button>
          <button
            className={item}
            onClick={() => {
              printLickSheet(lick, targetKey, bpm)
              setOpen(false)
            }}
          >
            <Printer className="h-4 w-4 text-[var(--color-amber)]" /> Skriv ut noter (PDF)
          </button>
        </div>
      )}
    </div>
  )
}
