'use client'

// Oppslagsverket: søkbar, kategorisert visning av hele GLOSSARY.
// Dyplenking: /oppslagsverk#<id> scroller til oppføringen og gir den en
// forbigående amber-ring (også når seeAlso-chips klikkes internt).

import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Search, X } from 'lucide-react'
import {
  GLOSSARY,
  GLOSSARY_BY_ID,
  GLOSSARY_CATEGORY_LABEL,
  GLOSSARY_CATEGORY_ORDER,
  type GlossaryTerm,
} from '@/data/glossary'
import { cn } from '@/lib/cn'

export function GlossaryBrowser() {
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase()
    const hits = q
      ? GLOSSARY.filter((t) =>
          [t.term, t.short, t.body, ...(t.aliases ?? [])].some((s) =>
            s.toLowerCase().includes(q),
          ),
        )
      : GLOSSARY
    return GLOSSARY_CATEGORY_ORDER.map((category) => ({
      category,
      label: GLOSSARY_CATEGORY_LABEL[category],
      terms: hits
        .filter((t) => t.category === category)
        .sort((a, b) => a.term.localeCompare(b.term, 'nb')),
    })).filter((s) => s.terms.length > 0)
  }, [query])

  const hitCount = sections.reduce((n, s) => n + s.terms.length, 0)

  function jumpTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setHighlighted(id)
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => setHighlighted(null), 1600)
  }

  // Dyplenke fra popoverens «Les mer» / eksterne #anker
  useEffect(() => {
    function fromHash() {
      const id = window.location.hash.slice(1)
      if (id && GLOSSARY_BY_ID.has(id)) jumpTo(id)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => {
      window.removeEventListener('hashchange', fromHash)
      if (highlightTimer.current) clearTimeout(highlightTimer.current)
    }
  }, [])

  return (
    <div>
      <div className="mb-2 flex items-center gap-2.5">
        <BookOpen className="h-6 w-6 text-[var(--color-amber)]" />
        <h1 className="font-display text-2xl text-[var(--color-ivory)] sm:text-3xl">
          Oppslagsverk
        </h1>
      </div>
      <p className="mb-6 max-w-prose text-sm leading-relaxed text-[var(--color-muted)]">
        Fagordene du møter i appen — og i musikklivet ellers — forklart på norsk. Ord med
        prikket understrek rundt om i appen kan klikkes for en kortversjon; her finner du
        hele forklaringen.
      </p>

      <div className="relative mb-3 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søk etter begrep…"
          className="w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-9 text-sm text-[var(--color-ivory)] outline-none focus:border-[var(--color-amber)]"
        />
        {query && (
          <button
            type="button"
            aria-label="Tøm søk"
            onClick={() => setQuery('')}
            className="absolute right-2.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-[var(--color-muted)] hover:text-[var(--color-ivory)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <p className="mb-6 text-xs text-[var(--color-muted)]">
        {hitCount} {hitCount === 1 ? 'oppføring' : 'oppføringer'}
        {query.trim() && ' funnet'}
      </p>

      {hitCount === 0 && (
        <p className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-muted)]">
          Ingen treff på «{query.trim()}». Prøv et annet ord — eller send oss gjerne et
          begrep du savner via «Send inn en lick»-skjemaet.
        </p>
      )}

      {sections.map((section) => (
        <section key={section.category} className="mb-10">
          <h2 className="mb-4 font-display text-lg text-[var(--color-amber)]">
            {section.label}
          </h2>
          <div className="flex flex-col gap-4">
            {section.terms.map((term) => (
              <GlossaryEntry
                key={term.id}
                term={term}
                highlighted={highlighted === term.id}
                onJump={jumpTo}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function GlossaryEntry({
  term,
  highlighted,
  onJump,
}: {
  term: GlossaryTerm
  highlighted: boolean
  onJump: (id: string) => void
}) {
  const related = (term.seeAlso ?? [])
    .map((id) => GLOSSARY_BY_ID.get(id))
    .filter((t): t is GlossaryTerm => Boolean(t))

  return (
    <article
      id={term.id}
      className={cn(
        'scroll-mt-24 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-shadow',
        highlighted && 'ring-1 ring-[var(--color-amber)]/60',
      )}
    >
      <h3 className="font-display text-base text-[var(--color-ivory)]">{term.term}</h3>
      {term.body.split('\n\n').map((paragraph, i) => (
        <p key={i} className="mt-2.5 text-sm leading-relaxed text-[var(--color-muted)]">
          {paragraph}
        </p>
      ))}
      {related.length > 0 && (
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-[var(--color-muted)]">Se også:</span>
          {related.map((rel) => (
            <button
              key={rel.id}
              type="button"
              onClick={() => onJump(rel.id)}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] px-2.5 py-0.5 text-xs text-[var(--color-ivory)] transition-colors hover:border-[var(--color-amber)]"
            >
              {rel.term}
            </button>
          ))}
        </div>
      )}
    </article>
  )
}
