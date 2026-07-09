'use client'

// Auto-lenker fagord i datadrevne strenger (lick-/kursbeskrivelser).
// Bytter én-til-én med et vanlig avsnitt:
//   <p className="...">{desc}</p>  →  <GlossaryText text={desc} className="..." />
// Matchingen er en ren, deterministisk funksjon av teksten → hydrerings-trygg.
//
// Skal ALDRI brukes inne i en <Link> eller <button> (Terms er selv knapper) —
// se kontrakten i Term.tsx.

import { useMemo } from 'react'
import { matchGlossaryTerms } from '@/lib/glossary-match'
import { Term } from './Term'

export function GlossaryText({
  text,
  className,
  as: Tag = 'p',
}: {
  text: string
  className?: string
  as?: 'p' | 'span'
}) {
  const segments = useMemo(() => matchGlossaryTerms(text), [text])
  return (
    <Tag className={className}>
      {segments.map((seg, i) =>
        seg.kind === 'term' ? (
          <Term key={i} id={seg.id}>
            {seg.value}
          </Term>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </Tag>
  )
}
