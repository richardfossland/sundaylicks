'use client'

// Oppslagsverket: søkbar, kategorisert og NÅ pedagogisk visning av hele GLOSSARY.
// Hver oppføring er kollapsbar (term + kort forklaring når lukket; full body +
// interaktiv demo + «se også» når åpen). Demoene lastes `dynamic({ ssr:false })`
// slik at Tone/AudioContext aldri når server-render — datafila glossary-demos.ts
// er Tone-fri og trygg å importere statisk her (for demo-badge + «hør»-lenke).
//
// Dyplenking: /oppslagsverk#<id> (og interne «se også»-hopp) ekspanderer
// oppføringen FØR den scroller inn og gir den en forbigående amber-ring. Søk med
// ≤3 treff ekspanderer treffene automatisk. En sticky kategori-chip-navigasjon
// (skjult under søk) sporer aktiv seksjon via én IntersectionObserver.

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { ArrowUp, BookOpen, ChevronDown, Search, Volume2, X } from 'lucide-react'
import {
  GLOSSARY,
  GLOSSARY_BY_ID,
  GLOSSARY_CATEGORY_LABEL,
  GLOSSARY_CATEGORY_ORDER,
  type GlossaryCategory,
  type GlossaryTerm,
} from '@/data/glossary'
import { DEMO_BY_TERM_ID } from '@/data/glossary-demos'
import { installAudioUnlock } from '@/lib/audio-unlock'
import { loadViewState, saveViewState } from '@/lib/view-state'
import { cn } from '@/lib/cn'

/** sessionStorage key for the glossary's browse state (see lib/view-state.ts). */
const VIEW_KEY = 'sundaylicks_view_glossary'

interface GlossaryViewState {
  query: string
  expanded: string[]
}

/** Reject a malformed blob; drop any expanded ids that no longer exist. */
function validateGlossaryState(d: Record<string, unknown>): GlossaryViewState | null {
  const { query, expanded } = d
  if (typeof query !== 'string') return null
  if (!Array.isArray(expanded) || !expanded.every((x) => typeof x === 'string')) return null
  return { query, expanded: expanded.filter((id) => GLOSSARY_BY_ID.has(id)) }
}

// Én dynamisk import for hele appen — behold på modulnivå så den ikke gjenskapes
// per render. `loading` gir en rolig plassholder mens Tone-bunten hentes.
const DemoBlock = dynamic(() => import('@/components/glossary/DemoBlock'), {
  ssr: false,
  loading: () => (
    <div className="h-28 animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-raised)]" />
  ),
})

const DEMO_COUNT = DEMO_BY_TERM_ID.size

export function GlossaryBrowser() {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<GlossaryCategory | null>(null)
  const [showTop, setShowTop] = useState(false)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Gates the save effect until the mount restore has run.
  const hydratedRef = useRef(false)

  const isSearching = query.trim().length > 0

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase()
    const hits = q
      ? GLOSSARY.filter((t) =>
          [t.term, t.short, t.body, ...(t.aliases ?? [])].some((s) => s.toLowerCase().includes(q)),
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

  // ── Ekspander/kollaps ──────────────────────────────────────────────────────
  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function jumpTo(id: string) {
    setExpanded((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
    setHighlighted(id)
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => setHighlighted(null), 1600)
    // Vent én frame så ekspanderingen er lagt ut før vi scroller.
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function scrollToCategory(category: GlossaryCategory) {
    document.getElementById(`cat-${category}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ── Gjenopprett browse-tilstand (søk + ekspanderte) FØR hash-håndteringen ──
  // Kjører én gang ved mount, før init-effekten under, slik at en #hash-dyplenke
  // legger seg oppå det gjenopprettede settet i stedet for å bli overskrevet.
  useEffect(() => {
    const saved = loadViewState(VIEW_KEY, validateGlossaryState)
    if (saved) {
      setQuery(saved.query)
      if (saved.expanded.length > 0) setExpanded(new Set(saved.expanded))
    }
    hydratedRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Lagre søk + ekspanderte (Set→array) ved hver endring når hydrert.
  useEffect(() => {
    if (!hydratedRef.current) return
    saveViewState(VIEW_KEY, { query, expanded: Array.from(expanded) })
  }, [query, expanded])

  // ── Init: lyd-unlock + hash-dyplenke ───────────────────────────────────────
  useEffect(() => {
    installAudioUnlock()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Søk med ≤3 treff ekspanderer treffene ──────────────────────────────────
  useEffect(() => {
    if (!isSearching || hitCount === 0 || hitCount > 3) return
    setExpanded((prev) => {
      const next = new Set(prev)
      for (const s of sections) for (const t of s.terms) next.add(t.id)
      return next
    })
  }, [isSearching, hitCount, sections])

  // ── Back-to-top ────────────────────────────────────────────────────────────
  useEffect(() => {
    function onScroll() {
      setShowTop(window.scrollY > 600)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── Aktiv seksjon (chip-nav) via én IntersectionObserver ───────────────────
  useEffect(() => {
    if (isSearching) {
      setActiveCategory(null)
      return
    }
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-cat]'))
    if (els.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          setActiveCategory(visible[0].target.getAttribute('data-cat') as GlossaryCategory)
        }
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [isSearching, sections.length])

  return (
    <div>
      {/* Hero */}
      <div className="mb-2 flex items-center gap-2.5">
        <BookOpen className="h-6 w-6 text-[var(--color-amber)]" />
        <h1 className="font-display text-2xl text-[var(--color-ivory)] sm:text-3xl">Oppslagsverk</h1>
      </div>
      <p className="mb-2 max-w-prose text-sm leading-relaxed text-[var(--color-muted)]">
        Fagordene du møter i appen — og i musikklivet ellers — forklart på norsk. Klikk en oppføring
        for hele forklaringen; mange har en interaktiv modell du kan høre og prøve.
      </p>
      <p className="mb-5 text-xs font-medium text-[var(--color-amber)]">
        {DEMO_COUNT} av {GLOSSARY.length} har interaktiv demo
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

      <p className="mb-4 text-xs text-[var(--color-muted)]">
        {hitCount} {hitCount === 1 ? 'oppføring' : 'oppføringer'}
        {isSearching && ' funnet'}
      </p>

      {/* Sticky kategori-chip-nav (skjult under søk) */}
      {!isSearching && sections.length > 0 && (
        <nav
          aria-label="Hopp til kategori"
          className="scroll-x sticky top-[70px] z-20 -mx-4 mb-6 flex gap-2 border-b border-[var(--color-border)] bg-[var(--color-scene)]/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-scene)]/80"
        >
          {sections.map((section) => (
            <button
              key={section.category}
              type="button"
              onClick={() => scrollToCategory(section.category)}
              aria-current={activeCategory === section.category ? 'true' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                activeCategory === section.category
                  ? 'border-[var(--color-amber)] bg-[var(--color-amber)]/15 text-[var(--color-amber)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
              )}
            >
              {section.label}
              <span className="opacity-60">{section.terms.length}</span>
            </button>
          ))}
        </nav>
      )}

      {hitCount === 0 && (
        <p className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-muted)]">
          Ingen treff på «{query.trim()}». Prøv et annet ord — eller send oss gjerne et begrep du
          savner via «Send inn en lick»-skjemaet.
        </p>
      )}

      {sections.map((section) => (
        <section key={section.category} id={`cat-${section.category}`} data-cat={section.category} className="mb-10 scroll-mt-32">
          <h2 className="mb-4 font-display text-lg text-[var(--color-ivory)]">{section.label}</h2>
          <div className="flex flex-col gap-3">
            {section.terms.map((term) => (
              <GlossaryEntry
                key={term.id}
                term={term}
                expanded={expanded.has(term.id)}
                highlighted={highlighted === term.id}
                onToggle={toggle}
                onJump={jumpTo}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Tilbake til toppen */}
      {showTop && (
        <button
          type="button"
          aria-label="Til toppen"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="animate-fade-in fixed bottom-6 right-6 z-40 grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ivory)] shadow-lg shadow-black/40 transition-colors hover:border-[var(--color-amber)]"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

function GlossaryEntry({
  term,
  expanded,
  highlighted,
  onToggle,
  onJump,
}: {
  term: GlossaryTerm
  expanded: boolean
  highlighted: boolean
  onToggle: (id: string) => void
  onJump: (id: string) => void
}) {
  const demo = DEMO_BY_TERM_ID.get(term.id)
  const related = (term.seeAlso ?? [])
    .map((id) => GLOSSARY_BY_ID.get(id))
    .filter((t): t is GlossaryTerm => Boolean(t))
  const panelId = `entry-${term.id}`

  return (
    <article
      id={term.id}
      className={cn(
        'scroll-mt-32 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-shadow',
        highlighted && 'ring-1 ring-[var(--color-amber)]/60',
      )}
    >
      {/* Header = fullbredde-knapp. Kun spans inni (aldri <p>/<div> i en <button>). */}
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => onToggle(term.id)}
        className="flex w-full items-start gap-3 rounded-2xl p-5 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-base text-[var(--color-ivory)]">{term.term}</span>
            {demo && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-amber)]/40 bg-[var(--color-amber)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-amber)]">
                <Volume2 className="h-3 w-3" /> Hør og se
              </span>
            )}
          </span>
          {!expanded && (
            <span className="mt-1.5 block text-sm leading-relaxed text-[var(--color-muted)]">
              {term.short}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'mt-0.5 h-5 w-5 shrink-0 text-[var(--color-muted)] transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {expanded && (
        <div id={panelId} className="animate-fade-in px-5 pb-5">
          {term.body.split('\n\n').map((paragraph, i) => (
            <p key={i} className="mb-2.5 text-sm leading-relaxed text-[var(--color-muted)]">
              {paragraph}
            </p>
          ))}

          {demo && (
            <div className="mt-4">
              <DemoBlock demo={demo} />
            </div>
          )}

          {related.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
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
        </div>
      )}
    </article>
  )
}
