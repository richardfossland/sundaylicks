// ── Skalaer (rene, dep-frie) ────────────────────────────────────────────────
//
// Én sannhetskilde for skala-øvingsflaten i /spill («Skalaer»-fanen). Alt her er
// stateless aritmetikk på halvtoner (0–11 innen oktaven), på linje med resten av
// theory/*-modulene (keys.ts / voicings.ts / music.ts) — ingen lyd, ingen DB.
//
// To ting flaten trenger:
//   1) SCALES — katalogen: id, norsk navn, gruppe, halvtone-intervaller, formel,
//      og en kort pedagogisk klang/bruk-setning i oppslagsverkets stemme.
//   2) CHORD_SCALES — det VIKTIGSTE for eieren: hvilke skalaer passer over hvilken
//      akkord, rangert (1 = tryggest/mest brukt), med én kort «hvorfor»-setning.
//
// `scalePitches` legger en skala ut som konkrete MIDI-toner rundt C4 (60), slik at
// MiniKeyboard og øvings-generatoren (scale-licks.ts) kan bruke den direkte.

import { pitchClass } from '../music'
import { nearestOffset } from '../transpose'

export type ScaleGroup = 'grunn' | 'kirketoneart' | 'pentaton' | 'jazz'

export interface ScaleDef {
  /** kebab-/ord-id, brukt som React-nøkkel, tag og oppslag i SCALE_BY_ID. */
  id: string
  /** Norsk visningsnavn, f.eks. 'Dur (jonisk)'. */
  name: string
  group: ScaleGroup
  /** Halvtoner fra grunntonen, stigende, innen oktaven (uten oktavtonen). Starter på 0. */
  intervals: number[]
  /** Skalatrinn-formel, f.eks. '1 2 b3 4 5 6 b7'. Antall tokens == intervals.length. */
  formula: string
  /** Én setning om klang/bruk — oppslagsverkets pedagogiske stemme. */
  short: string
  /** Dyplenke til /oppslagsverk#<id> når en oppføring faktisk finnes der. */
  glossaryId?: string
}

// Rekkefølge = visningsrekkefølge i chip-gruppene. 4 grunn + 5 kirketonearter +
// 3 pentaton/blues + 5 jazzfarger = 17 skalaer.
export const SCALES: ScaleDef[] = [
  // ── Grunnskalaer ──────────────────────────────────────────────────────────
  {
    id: 'dur',
    name: 'Dur (jonisk)',
    group: 'grunn',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    formula: '1 2 3 4 5 6 7',
    short: 'Den lyse grunnskalaen de fleste melodier bygger på — glad og stabil, med ledetone opp mot grunntonen.',
    glossaryId: 'skala',
  },
  {
    id: 'moll',
    name: 'Moll (naturlig / eolisk)',
    group: 'grunn',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    formula: '1 2 b3 4 5 b6 b7',
    short: 'Durens mørke slektning — samme toner som durskalaen en liten ters over (jonisk = dur, eolisk = moll).',
  },
  {
    id: 'harmonisk-moll',
    name: 'Harmonisk moll',
    group: 'grunn',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    formula: '1 2 b3 4 5 b6 7',
    short: 'Moll med hevet 7. trinn så dominanten får ledetone — det store spranget b6→7 gir et dramatisk, «orientalsk» drag.',
  },
  {
    id: 'melodisk-moll',
    name: 'Melodisk moll',
    group: 'grunn',
    intervals: [0, 2, 3, 5, 7, 9, 11],
    formula: '1 2 b3 4 5 6 7',
    short: 'Som dur, men med liten ters — jevn og syngende. Kilden til flere av jazzens fargeskalaer (altered, lokrisk #2).',
  },
  // ── Kirketonearter ────────────────────────────────────────────────────────
  {
    id: 'dorisk',
    name: 'Dorisk',
    group: 'kirketoneart',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    formula: '1 2 b3 4 5 6 b7',
    short: 'Den vanligste mollfargen i jazz og gospel — liten ters, men lys stor sekst som løfter det litt.',
  },
  {
    id: 'frygisk',
    name: 'Frygisk',
    group: 'kirketoneart',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    formula: '1 b2 b3 4 5 b6 b7',
    short: 'Mørk moll med liten sekund helt nederst — gir en spansk/flamenco-aktig spenning fra grunntonen.',
  },
  {
    id: 'lydisk',
    name: 'Lydisk',
    group: 'kirketoneart',
    intervals: [0, 2, 4, 6, 7, 9, 11],
    formula: '1 2 3 #4 5 6 7',
    short: 'Dur med hevet kvart (#11) — svevende og lys, filmmusikkens «undring». Perfekt over maj7-akkorder.',
  },
  {
    id: 'mixolydisk',
    name: 'Mixolydisk',
    group: 'kirketoneart',
    intervals: [0, 2, 4, 5, 7, 9, 10],
    formula: '1 2 3 4 5 6 b7',
    short: 'Dur med liten septim — dominantakkordens hjemmeskala. Ryggraden i blues, gospel og rock.',
  },
  {
    id: 'lokrisk',
    name: 'Lokrisk',
    group: 'kirketoneart',
    intervals: [0, 1, 3, 5, 6, 8, 10],
    formula: '1 b2 b3 4 b5 b6 b7',
    short: 'Den mest ustabile kirketonearten — både liten sekund og forminsket kvint. Halvforminsket-akkordens egen skala.',
  },
  // ── Pentaton & blues ────────────────────────────────────────────────────────
  {
    id: 'pentaton-dur',
    name: 'Pentaton dur',
    group: 'pentaton',
    intervals: [0, 2, 4, 7, 9],
    formula: '1 2 3 5 6',
    short: 'Fem toner uten halvtonesteg — ingenting kolliderer, alt låter «riktig». Trygg over dur og lovsang.',
    glossaryId: 'pentatonskala',
  },
  {
    id: 'pentaton-moll',
    name: 'Pentaton moll',
    group: 'pentaton',
    intervals: [0, 3, 5, 7, 10],
    formula: '1 b3 4 5 b7',
    short: 'Blues- og soloskalaens kjerne — fem toner som alltid sitter over en mollakkord.',
    glossaryId: 'pentatonskala',
  },
  {
    id: 'blues',
    name: 'Blues-skala',
    group: 'pentaton',
    intervals: [0, 3, 5, 6, 7, 10],
    formula: '1 b3 4 b5 5 b7',
    short: 'Pentaton moll pluss «blåtonen» (b5) — gospelens og bluesens skarpe, uttrykksfulle krydder.',
    glossaryId: 'blues-skala',
  },
  // ── Jazzfarger ──────────────────────────────────────────────────────────────
  {
    id: 'altered',
    name: 'Altered (super-lokrisk)',
    group: 'jazz',
    intervals: [0, 1, 3, 4, 6, 8, 10],
    formula: '1 b9 #9 3 #11 b13 b7',
    short: 'Alle spenningstonene på én dominant (b9, #9, #11, b13) — maksimal uro rett før den løser til en mollakkord.',
  },
  {
    id: 'halv-hel-dim',
    name: 'Halv/hel-forminsket',
    group: 'jazz',
    intervals: [0, 1, 3, 4, 6, 7, 9, 10],
    formula: '1 b9 #9 3 b5 5 13 b7',
    short: 'Åttetonig, veksler halvt–helt fra grunntonen — gir b9 og #9 over en dominant (7b9) med diminert farge.',
  },
  {
    id: 'hel-halv-dim',
    name: 'Hel/halv-forminsket',
    group: 'jazz',
    intervals: [0, 2, 3, 5, 6, 8, 9, 11],
    formula: '1 2 b3 4 b5 #5 6 7',
    short: 'Åttetonig, veksler helt–halvt — treffer alle fire tonene i en forminsket septimakkord (dim7).',
  },
  {
    id: 'heltone',
    name: 'Heltoneskala',
    group: 'jazz',
    intervals: [0, 2, 4, 6, 8, 10],
    formula: '1 2 3 #4 #5 b7',
    short: 'Bare helttonesteg hele veien — drømmeaktig og retningsløs, med forstørret kvint. Passer aug- og 7#5-akkorder.',
  },
  {
    id: 'bebop-dominant',
    name: 'Bebop-dominant',
    group: 'jazz',
    intervals: [0, 2, 4, 5, 7, 9, 10, 11],
    formula: '1 2 3 4 5 6 b7 7',
    short: 'Mixolydisk med en ekstra gjennomgangstone (stor septim) — åtte toner som lar åttedelslinjer lande på akkordtoner på slaget.',
  },
]

export const SCALE_BY_ID: ReadonlyMap<string, ScaleDef> = new Map(SCALES.map((s) => [s.id, s]))

/** Norske gruppetitler for chip-seksjonene. */
export const SCALE_GROUP_LABEL: Record<ScaleGroup, string> = {
  grunn: 'Grunnskalaer',
  kirketoneart: 'Kirketonearter',
  pentaton: 'Pentaton & blues',
  jazz: 'Jazzfarger',
}

/** Visningsrekkefølge for gruppene (matcher SCALES-rekkefølgen). */
export const SCALE_GROUP_ORDER: ScaleGroup[] = ['grunn', 'kirketoneart', 'pentaton', 'jazz']

/**
 * Legg en skala ut som konkrete MIDI-toner: grunntonen i registeret nærmest
 * `base` (C4=60), stigende gjennom `octaves` oktaver, med oktavtonen på toppen.
 * Antall toner = octaves * intervals.length + 1.
 */
export function scalePitches(rootPc: number, scale: ScaleDef, octaves = 2, base = 60): number[] {
  const rootMidi = base + nearestOffset(pitchClass(base), pitchClass(rootPc))
  const out: number[] = []
  for (let o = 0; o < octaves; o++) {
    for (const iv of scale.intervals) out.push(rootMidi + o * 12 + iv)
  }
  out.push(rootMidi + octaves * 12) // oktavtonen på toppen
  return out
}

// ── Akkord → skala-forslag ───────────────────────────────────────────────────

export interface ChordScaleFit {
  scaleId: string
  /** 1 = tryggest/mest brukt, 3 = mest fargerik/spent. Ikke nødvendigvis unik. */
  rank: 1 | 2 | 3
  /** Én kort norsk setning om hvorfor skalaen passer over denne akkorden. */
  why: string
}

// Nøklet på SpiceChordPicker sitt QUALITY_OPTIONS-vokabular (inkl. '' = dur-
// treklang), pluss noen ekstra kvaliteter (6/m6/aug/7sus4) som picker'en kan
// sende via egendefinert-modus. scalesForChord faller tilbake til dur ved ukjent.
export const CHORD_SCALES: Record<string, ChordScaleFit[]> = {
  maj7: [
    { scaleId: 'dur', rank: 1, why: 'Akkordtonene 1-3-5-7 ligger midt i durskalaen — den trygge grunnfargen.' },
    { scaleId: 'lydisk', rank: 2, why: 'Hevet kvart (#11) løfter og gir en lysere, mer moderne klang.' },
    { scaleId: 'pentaton-dur', rank: 3, why: 'Fem toner som aldri støter mot akkorden — enkelt og rent.' },
  ],
  maj9: [
    { scaleId: 'dur', rank: 1, why: 'Nonen (9) er allerede med i durskalaen — akkordtonene sitter naturlig.' },
    { scaleId: 'lydisk', rank: 2, why: 'Hevet kvart gir maj9-klangen et ekstra svevende løft.' },
    { scaleId: 'pentaton-dur', rank: 3, why: 'Trygt toneutvalg som fremhever 9 og 6 uten å kollidere.' },
  ],
  m7: [
    { scaleId: 'dorisk', rank: 1, why: 'Liten ters + lys stor sekst — den vanligste, mest nøytrale mollfargen.' },
    { scaleId: 'moll', rank: 2, why: 'Naturlig moll, litt mørkere med liten sekst.' },
    { scaleId: 'pentaton-moll', rank: 3, why: 'Fem trygge toner som alltid sitter over m7.' },
    { scaleId: 'blues', rank: 3, why: 'Legg til blåtonen for et gospel-/blueskrydder.' },
  ],
  m9: [
    { scaleId: 'dorisk', rank: 1, why: 'Nonen bor i dorisk — den rikeste, mest brukte m9-fargen.' },
    { scaleId: 'moll', rank: 2, why: 'Naturlig moll fungerer også; litt mørkere karakter.' },
    { scaleId: 'pentaton-moll', rank: 3, why: 'Enkelt utvalg som fremhever grunntone, 9 og b7.' },
  ],
  m: [
    { scaleId: 'dorisk', rank: 1, why: 'Standard mollfarge over en ren mollakkord.' },
    { scaleId: 'moll', rank: 2, why: 'Naturlig moll — mørkere med liten sekst.' },
    { scaleId: 'pentaton-moll', rank: 3, why: 'Fem toner som alltid sitter — trygt startpunkt.' },
  ],
  '7': [
    { scaleId: 'mixolydisk', rank: 1, why: 'Dominantens hjemmeskala — liten septim uten videre spenning.' },
    { scaleId: 'bebop-dominant', rank: 2, why: 'Ekstra gjennomgangstone gir jevn åttedelsflyt som lander på slaget.' },
    { scaleId: 'altered', rank: 3, why: 'Maksimal spenning rett før den løser til en mollakkord.' },
    { scaleId: 'halv-hel-dim', rank: 3, why: 'Diminert farge — gir b9 og #9 over dominanten.' },
    { scaleId: 'heltone', rank: 3, why: 'Forstørret kvint (#5) gir en drømmeaktig, retningsløs dominant.' },
  ],
  '9': [
    { scaleId: 'mixolydisk', rank: 1, why: 'Nonen er med i mixolydisk — dominantens naturlige skala.' },
    { scaleId: 'bebop-dominant', rank: 2, why: 'Jevn åttedelsflyt der akkordtonene faller på slaget.' },
    { scaleId: 'altered', rank: 3, why: 'Bytt til altered for maksimal spenning før oppløsningen.' },
  ],
  m7b5: [
    { scaleId: 'lokrisk', rank: 1, why: 'Halvforminsket-akkordens egen skala — b5 og b2 sitter i tonene.' },
    { scaleId: 'melodisk-moll', rank: 2, why: 'Fra b3 gir den lokrisk #2 — en mildere halvforminsket farge.' },
  ],
  dim7: [
    { scaleId: 'hel-halv-dim', rank: 1, why: 'Helt–halvt-mønsteret treffer alle fire tonene i dim7-akkorden.' },
  ],
  sus4: [
    { scaleId: 'mixolydisk', rank: 1, why: 'Liten septim og ren kvart — sus-akkordens naturlige skala.' },
    { scaleId: 'pentaton-dur', rank: 2, why: 'Unngår ters-kollisjonen og holder den åpne sus-klangen.' },
  ],
  '': [
    { scaleId: 'dur', rank: 1, why: 'Grunnskalaen over en durtreklang.' },
    { scaleId: 'pentaton-dur', rank: 2, why: 'Fem toner som aldri kolliderer med treklangen.' },
    { scaleId: 'blues', rank: 3, why: 'Gospelens krydder over dur — blåtonen gir farge.' },
  ],
  // ── Ekstra kvaliteter (egendefinert-modus) ──────────────────────────────────
  '6': [
    { scaleId: 'dur', rank: 1, why: 'Seksten er med i durskalaen — akkordtonene sitter rett i den.' },
    { scaleId: 'pentaton-dur', rank: 2, why: 'Fremhever 6 og 9 uten å røre ledetonen.' },
  ],
  m6: [
    { scaleId: 'melodisk-moll', rank: 1, why: 'Stor sekst over liten ters — nøyaktig m6-fargen.' },
    { scaleId: 'dorisk', rank: 2, why: 'Har også stor sekst; litt mildere med liten septim.' },
  ],
  aug: [
    { scaleId: 'heltone', rank: 1, why: 'Den forstørrede treklangen bor rett i heltoneskalaen.' },
  ],
  '7sus4': [
    { scaleId: 'mixolydisk', rank: 1, why: 'Liten septim og ren kvart — sus-dominantens skala.' },
    { scaleId: 'pentaton-dur', rank: 2, why: 'Åpen klang uten ters-kollisjon.' },
  ],
}

/**
 * Rangerte skala-forslag for en akkordkvalitet. Ukjent kvalitet faller tilbake
 * til dur-treklangens forslag (den tryggeste, mest generelle fargen).
 */
export function scalesForChord(quality: string): ChordScaleFit[] {
  return CHORD_SCALES[quality] ?? CHORD_SCALES['']
}
