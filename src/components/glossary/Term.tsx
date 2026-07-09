'use client'

// Klikkbart fagord med forklarings-popover. Brukes manuelt rundt jargong i
// hardkodet copy (<Term id="voicing">voicinger</Term>) og automatisk av
// <GlossaryText>. HARD REGEL: aldri render en Term inne i en <Link> eller
// <button> — nøstede interaktive elementer er ugyldig HTML og brekker
// navigasjon (LickCard er f.eks. én stor Link og skal IKKE ha Terms).
//
// All markup er <span>-basert: Terms lever inne i <p>, og <p> kan ikke
// inneholde <div> (ugyldig HTML gir hydrerings-feil i React 19).

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { GLOSSARY_BY_ID } from '@/data/glossary'

/** Kun én popover åpen om gangen — alle åpne Terms lukker seg når en annen åpner. */
const OPEN_EVENT = 'sl-term-popover-open'

const PANEL_WIDTH = 288 // w-72
const VIEWPORT_MARGIN = 12

export function Term({ id, children }: { id: string; children: React.ReactNode }) {
  const entry = GLOSSARY_BY_ID.get(id)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null)
  const rootRef = useRef<HTMLSpanElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const instanceId = useId()

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const left = Math.min(
      Math.max(rect.left, VIEWPORT_MARGIN),
      window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN,
    )
    // Flip over trigger når det er trangt under (est. panelhøyde ~180px)
    const above = rect.bottom + 190 > window.innerHeight && rect.top > 200
    setPos({ top: above ? rect.top - 8 : rect.bottom + 8, left, above })
  }, [])

  useEffect(() => {
    if (!open) return
    place()
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    // Fixed panel løsner fra inline-triggeren ved scroll — lukk i stedet for å flyte.
    function onScroll() {
      setOpen(false)
    }
    function onOtherOpen(e: Event) {
      if ((e as CustomEvent<string>).detail !== instanceId) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    document.addEventListener(OPEN_EVENT, onOtherOpen)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
      document.removeEventListener(OPEN_EVENT, onOtherOpen)
    }
  }, [open, place, instanceId])

  // Ukjent id: render barna som ren tekst i stedet for å krasje.
  if (!entry) return <>{children}</>

  return (
    <span ref={rootRef} className="relative inline">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          if (!open) document.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: instanceId }))
          setOpen((v) => !v)
        }}
        className="cursor-help rounded-sm underline decoration-[var(--color-muted)]/70 decoration-dotted underline-offset-4 transition-colors hover:decoration-[var(--color-amber)]"
      >
        {children}
      </button>
      {open && pos && (
        <span
          role="dialog"
          aria-label={entry.term}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: PANEL_WIDTH,
            transform: pos.above ? 'translateY(-100%)' : undefined,
          }}
          className="animate-fade-in z-50 block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left shadow-lg shadow-black/40"
        >
          <span className="block font-display text-base text-[var(--color-ivory)]">
            {entry.term}
          </span>
          <span className="mt-1.5 block text-sm leading-relaxed text-[var(--color-muted)]">
            {entry.short}
          </span>
          <Link
            href={`/oppslagsverk#${entry.id}`}
            className="mt-2.5 block text-xs font-medium text-[var(--color-amber)] transition-colors hover:text-[var(--color-ivory)]"
            onClick={() => setOpen(false)}
          >
            Les mer i oppslagsverket →
          </Link>
        </span>
      )}
    </span>
  )
}
