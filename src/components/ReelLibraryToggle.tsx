'use client'

import Link from 'next/link'
import { ACCENT_CLASSES } from '@/lib/modes'
import { cn } from '@/lib/cn'

const amber = ACCENT_CLASSES.amber

/**
 * Segmentert «Bla ↔ Bibliotek»-veksler mellom de to browse-flatene over samme
 * bibliotek: reel-blaingen (/bla) og listevisningen (/ove). Amber aktiv,
 * aria-current på den man står på. Rene <Link>-er (ikke onClick) så den funker
 * som ekte navigasjon overalt den plasseres — flytende oppå reelen i BlaView,
 * og som header-knapp i OveView.
 */
export function ReelLibraryToggle({
  active,
  className,
}: {
  active: 'bla' | 'ove'
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label="Velg visning"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] p-1',
        className,
      )}
    >
      <Seg href="/bla" current={active === 'bla'}>
        Bla
      </Seg>
      <Seg href="/ove" current={active === 'ove'}>
        Bibliotek
      </Seg>
    </div>
  )
}

function Seg({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
        current ? cn(amber.bg, amber.ink) : 'text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
      )}
    >
      {children}
    </Link>
  )
}
