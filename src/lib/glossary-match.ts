// Auto-lenking av fagord i løpende tekst. Ren funksjon (node-testbar):
// deler en streng i segmenter der kjente glossar-surfaces (term + aliaser)
// blir { kind: 'term' }-segmenter som <GlossaryText> rendrer som klikkbare
// <Term>-komponenter. Deterministisk for samme input → hydrerings-trygg.

import { GLOSSARY } from '@/data/glossary'

export type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'term'; value: string; id: string }

interface Surface {
  surface: string
  id: string
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

let cache: { regex: RegExp; idBySurface: Map<string, string> } | null = null

/**
 * Bygg én alternasjons-regex av alle matchbare surfaces, lengst først —
 * regex-motoren prøver alternativene i rekkefølge, så «gående bass» vinner
 * over «bass» og «rootless voicing» over «voicing» på samme posisjon.
 *
 * Ordgrenser: JS `\b` er ASCII-only og feiler inntil æ/ø/å («påswing» ville
 * matchet «swing»). Vi bruker Unicode-lookarounds i stedet:
 * (?<![\p{L}\p{N}]) … (?![\p{L}\p{N}]) — støttes av Node 20, workerd og alle
 * moderne nettlesere.
 */
function build(): { regex: RegExp; idBySurface: Map<string, string> } {
  if (cache) return cache
  const surfaces: Surface[] = []
  for (const entry of GLOSSARY) {
    if (entry.noAutoLink) continue
    surfaces.push({ surface: entry.term, id: entry.id })
    for (const alias of entry.aliases ?? []) surfaces.push({ surface: alias, id: entry.id })
  }
  surfaces.sort((a, b) => b.surface.length - a.surface.length)

  const idBySurface = new Map<string, string>()
  for (const { surface, id } of surfaces) {
    const key = surface.toLowerCase()
    if (!idBySurface.has(key)) idBySurface.set(key, id)
  }

  const alternation = surfaces.map((s) => escapeRegExp(s.surface)).join('|')
  const regex = new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternation})(?![\\p{L}\\p{N}])`, 'giu')
  cache = { regex, idBySurface }
  return cache
}

/**
 * Del `text` i segmenter. Kun FØRSTE forekomst per term-id blir et
 * 'term'-segment (unngår understrek-spam i lange beskrivelser); senere
 * forekomster forblir ren tekst. Matchen er case-insensitiv, men segmentet
 * beholder original casing fra kildeteksten.
 */
export function matchGlossaryTerms(text: string): Segment[] {
  if (!text) return [{ kind: 'text', value: text }]
  const { regex, idBySurface } = build()
  regex.lastIndex = 0

  const segments: Segment[] = []
  const seen = new Set<string>()
  let last = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    const id = idBySurface.get(m[0].toLowerCase())
    if (!id || seen.has(id)) continue
    seen.add(id)
    if (m.index > last) segments.push({ kind: 'text', value: text.slice(last, m.index) })
    segments.push({ kind: 'term', value: m[0], id })
    last = m.index + m[0].length
  }
  if (last < text.length || segments.length === 0) {
    segments.push({ kind: 'text', value: text.slice(last) })
  }
  return segments
}
