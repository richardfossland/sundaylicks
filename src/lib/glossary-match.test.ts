import { describe, expect, it } from 'vitest'
import { matchGlossaryTerms, type Segment } from './glossary-match'
import { GLOSSARY } from '@/data/glossary'

function termIds(segments: Segment[]): string[] {
  return segments.filter((s) => s.kind === 'term').map((s) => (s as { id: string }).id)
}

function roundTrip(segments: Segment[]): string {
  return segments.map((s) => s.value).join('')
}

describe('matchGlossaryTerms', () => {
  it('matcher et kjent fagord og bevarer teksten rundt', () => {
    const segs = matchGlossaryTerms('En voicing kan farge alt.')
    expect(termIds(segs)).toEqual(['voicing'])
    expect(roundTrip(segs)).toBe('En voicing kan farge alt.')
  })

  it('lengst match vinner: «gående bass» lenkes som ett begrep', () => {
    const segs = matchGlossaryTerms('Prøv en gående bass i venstre hånd.')
    expect(termIds(segs)).toEqual(['gaende-bass'])
  })

  it('lengst match vinner: «rotløs voicing» slår «voicing»', () => {
    const segs = matchGlossaryTerms('En rotløs voicing uten grunntonen.')
    expect(termIds(segs)).toEqual(['rootless-voicing'])
  })

  it('norske ordgrenser: sammensetninger matcher IKKE', () => {
    expect(termIds(matchGlossaryTerms('et påswing i svingende stil'))).toEqual([])
    expect(termIds(matchGlossaryTerms('swingende rytme'))).toEqual([])
  })

  it('ordgrenser fungerer inntil æ/ø/å', () => {
    // 'å' er \p{L} — «swingå» skal ikke matche 'swing'
    expect(termIds(matchGlossaryTerms('swingå'))).toEqual([])
    // men æ/ø/å UTENFOR ordet er gyldig grense
    expect(termIds(matchGlossaryTerms('øv swing øverst'))).toEqual(['swing'])
  })

  it('case-insensitiv match beholder original casing', () => {
    const segs = matchGlossaryTerms('SWING er følelsen.')
    const term = segs.find((s) => s.kind === 'term')
    expect(term?.value).toBe('SWING')
    expect(termIds(segs)).toEqual(['swing'])
  })

  it('spesialtegn-surfaces matcher uten regex-krasj', () => {
    expect(termIds(matchGlossaryTerms('Øv en 2-5-1 i alle tonearter.'))).toContain('ii-v-i')
    expect(termIds(matchGlossaryTerms('En klassisk ii–V–I her.'))).toContain('ii-v-i')
  })

  it('kun første forekomst per id lenkes', () => {
    const segs = matchGlossaryTerms('Swing her og swing der og swing overalt.')
    expect(termIds(segs)).toEqual(['swing'])
    expect(roundTrip(segs)).toBe('Swing her og swing der og swing overalt.')
  })

  it('to ulike begreper i samme tekst lenkes begge', () => {
    const segs = matchGlossaryTerms('En turnaround med swing.')
    expect(termIds(segs)).toEqual(['turnaround', 'swing'])
  })

  it('noAutoLink-oppføringer matcher aldri', () => {
    const noAuto = GLOSSARY.filter((t) => t.noAutoLink)
    expect(noAuto.length).toBeGreaterThan(0)
    for (const entry of noAuto) {
      const segs = matchGlossaryTerms(`Et ${entry.term} midt i setningen.`)
      expect(termIds(segs)).not.toContain(entry.id)
    }
  })

  it('«run» og «fill» (homografer) auto-lenkes ikke', () => {
    expect(termIds(matchGlossaryTerms('Et raskt run og et lite fill.'))).toEqual([])
  })

  it('tom streng gir ett tekst-segment', () => {
    expect(matchGlossaryTerms('')).toEqual([{ kind: 'text', value: '' }])
  })

  it('tekst uten treff round-trips uendret som ett segment', () => {
    const text = 'Her er det ingenting å slå opp.'
    expect(matchGlossaryTerms(text)).toEqual([{ kind: 'text', value: text }])
  })

  it('match helt i start og slutt av strengen', () => {
    const start = matchGlossaryTerms('Voicing først.')
    expect(termIds(start)).toEqual(['voicing'])
    expect(start[0]).toEqual({ kind: 'term', value: 'Voicing', id: 'voicing' })

    const end = matchGlossaryTerms('Alt handler om swing')
    expect(termIds(end)).toEqual(['swing'])
    expect(end[end.length - 1]).toEqual({ kind: 'term', value: 'swing', id: 'swing' })
  })

  it('round-trips alle seed-beskrivelser uendret (ingen teksttap)', async () => {
    const { SEED_LICKS } = await import('@/data/seed-licks')
    for (const lick of SEED_LICKS) {
      if (!lick.description) continue
      expect(roundTrip(matchGlossaryTerms(lick.description))).toBe(lick.description)
    }
  })
})
