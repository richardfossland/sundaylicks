// ── Gripebrett-geometri (ren, ingen lyd, ingen DOM) ──────────────────────────
//
// Sannhetskilde for hvordan en MIDI-tonehøyde blir til en spillbar posisjon
// {streng, bånd} på et gitargripebrett i standardstemming. Portet fra
// SundaySchools `fretboard-geometry.ts` (den DOM-frie halvdelen) — layout-delen
// hører til G2. Holdt AVHENGIGHETSFRI (kun `import type`) med vilje: validation.ts
// importerer GUITAR_STANDARD herfra, og seed.mjs kjører valideringen under Node
// (type-stripping), så denne filen får ALDRI dra inn Tone eller DOM.
//
// Streng-konvensjon (D1): 0-basert, index 0 = lav E (MIDI 40) … 5 = høy E (64) —
// identisk med GUITAR_STANDARD-indeksen. Bånd lagres ALDRI på en note; det
// utledes alltid som `f = p − GUITAR_STANDARD[s]` (D1b) og kan derfor aldri bli
// inkonsistent med tonehøyden.

import type { LickNote } from '@/types/lick'

/** Åpen-streng MIDI-tonehøyder, lav→høy. Index 0 er lav E (tegnes nederst). */
export const GUITAR_STANDARD = [40, 45, 50, 55, 59, 64] // E2, A2, D3, G3, B3, E4

/** Hvor mange bånd `bestPosition` vurderer som standard (en 24-bånds hals). */
export const DEFAULT_FRET_COUNT = 24

/** Øvre båndgrense en note kan lagres/foreslås innenfor (Zod: 0 ≤ f ≤ 15). */
export const MAX_FRET = 15

export interface FretPosition {
  string: number // strengindeks (0 = lav E … 5 = høy E)
  fret: number // 0 = åpen streng
}

// ── Skjematisk gripebrett-layout (G2) ────────────────────────────────────────
// Sannhetskilde for HVOR hver streng + bånd sitter i piksel-rommet, slik at både
// den interaktive GuitarFretboard og (senere) statiske diagrammer er enige.
// Portet fra SundaySchools fretboard-geometry (layout-halvdelen). Fortsatt
// DOM-fri: bare tall inn, tall ut. Konvensjon (dokumentert så renderer og brett
// er enige):
//   • Strenger tegnes som VANNRETTE rader. Den LAVE strengen (index 0, lav E)
//     sitter NEDERST — slik en gitar/bass henger og slik TAB leses. Derfor er
//     stringY SYNKENDE i index (stringY[0] er størst y, siste streng minst).
//   • Bånd fordeles LINEÆRT over bredden. Ekte bånd krymper logaritmisk mot
//     kroppen, men for et kompakt skjermdiagram bærer båndNUMMERET meningen, og
//     jevn avstand holder hvert bånd bredt nok til å treffe på en telefon.
//     fretX[0] er sadelen (åpen), fretX[fretCount] ytterkanten.

export interface FretboardLayout {
  /** y (px) for hver strengs midtlinje, indeksert av streng. Synkende: den lave
   * strengen (index 0) er nederst (størst y). */
  stringY: number[]
  /** x (px) for hver båndlinje, index 0..fretCount (0 = sadel). */
  fretX: number[]
  /** Skjermposisjon for streng+bånd. Bånd 0 ligger på sadelen; et grepet bånd
   * (bånd ≥ 1) sentreres mellom sine to båndlinjer, der en finger presser. */
  posOf(stringIdx: number, fret: number): { x: number; y: number }
}

/**
 * Legg ut `tuning.length` vannrette strenger og `fretCount` lineært fordelte
 * bånd i en widthPx × heightPx-boks. Strengene fordeles jevnt med et lite loddrett
 * innhogg så topp/bunn-strengen ikke ligger helt inntil kanten.
 */
export function fretboardLayout(
  tuning: number[],
  fretCount: number,
  widthPx: number,
  heightPx: number,
): FretboardLayout {
  const n = Math.max(1, tuning.length)
  const frets = Math.max(1, fretCount)

  // Jevne strengrader med 12 % innhogg topp+bunn; index 0 (lav) nederst.
  const inset = heightPx * 0.12
  const usable = heightPx - inset * 2
  const gap = n > 1 ? usable / (n - 1) : 0
  const stringY: number[] = []
  for (let i = 0; i < n; i++) {
    // i = 0 → nederst (størst y); i = n-1 → øverst (minst y).
    stringY.push(heightPx - inset - i * gap)
  }

  const fretX: number[] = []
  for (let f = 0; f <= frets; f++) fretX.push((f / frets) * widthPx)

  const posOf = (stringIdx: number, fret: number) => {
    const s = Math.min(Math.max(0, stringIdx), n - 1)
    const f = Math.min(Math.max(0, fret), frets)
    // Åpne noter ligger på sadelen; grepne noter mellom de omkringliggende båndene.
    const x = f === 0 ? fretX[0] : (fretX[f - 1] + fretX[f]) / 2
    return { x, y: stringY[s] }
  }

  return { stringY, fretX, posOf }
}

/** Manhattan-aktig avstand mellom to posisjoner (et båndhopp koster 1, et
 * strengbytte koster 2 — strengskifter er fysisk større sprang). */
function positionDistance(a: FretPosition, b: FretPosition): number {
  return Math.abs(a.fret - b.fret) + Math.abs(a.string - b.string) * 2
}

/**
 * Beste {streng, bånd} for å spille `pitch` på `tuning`. Prioritering:
 *   1. posisjons-kontinuitet — hold deg nær `prev` når den er gitt (jevnt spill);
 *   2. lave bånd — favoriser åpen..5 «hjemme»-båndet, deretter laveste bånd;
 * så uten `prev` vinner den laveste komfortable posisjonen, og med `prev` vinner
 * den nærmeste nåbare posisjonen (uavgjort brytes mot det lave båndet. Returnerer
 * null når tonehøyden ikke kan produseres noe sted på halsen (utenfor rekkevidde).
 */
export function bestPosition(
  pitch: number,
  tuning: number[],
  prev?: FretPosition,
  maxFret: number = DEFAULT_FRET_COUNT,
): FretPosition | null {
  const candidates: FretPosition[] = []
  for (let s = 0; s < tuning.length; s++) {
    const fret = pitch - tuning[s]
    if (fret >= 0 && fret <= maxFret) candidates.push({ string: s, fret })
  }
  if (candidates.length === 0) return null

  // Straff for å forlate åpen..5 hjemme-båndet (0 inni det, vokser over).
  const bandPenalty = (fret: number) => (fret <= 5 ? 0 : fret - 5)

  const score = (pos: FretPosition) => {
    if (prev) {
      // Kontinuitet dominerer; båndstraffen bryter bare uavgjort.
      return positionDistance(pos, prev) * 10 + bandPenalty(pos.fret)
    }
    // Ingen historikk: foretrekk hjemme-båndet, deretter laveste bånd totalt.
    return bandPenalty(pos.fret) * 10 + pos.fret
  }

  let best = candidates[0]
  let bestScore = score(best)
  for (let i = 1; i < candidates.length; i++) {
    const sc = score(candidates[i])
    if (sc < bestScore) {
      bestScore = sc
      best = candidates[i]
    }
  }
  return best
}

/**
 * Utledet bånd for en note, gitt dens lagrede streng (D1b). Krever at noten har
 * `s` — kall dette kun på gitarnoter (piano-noter har aldri `s`).
 */
export function derivedFret(n: LickNote): number {
  if (n.s === undefined) {
    throw new Error('derivedFret: noten mangler streng (s) — kun gitarnoter har utledet bånd')
  }
  return n.p - GUITAR_STANDARD[n.s]
}

/**
 * Spillbare {streng, bånd}-posisjoner for hele licken etter transponering med
 * `offset` halvtoner (D1c). Invariant for hvert element: den transponerte
 * tonehøyden `p + offset === GUITAR_STANDARD[string] + fret`.
 *
 * Strategien er deterministisk og gjør enten/eller for HELE licken:
 *   • Behold den forfattede fingersettingen når alle utledede bånd fortsatt
 *     ligger innenfor 0–MAX_FRET etter transponeringen (TAB + gripebrett er
 *     enige fordi begge leser denne funksjonen).
 *   • Ellers om-fingres hele licken via en bestPosition-kjede på de transponerte
 *     tonehøydene (kontinuitet fra note til note), så ingenting havner utenfor
 *     halsen. Alt-eller-ingenting unngår at halve licken hopper streng.
 */
export function fretPositions(notes: LickNote[], offset: number): FretPosition[] {
  // Forsøk 1: behold lagret streng, bare skyv båndet med offset.
  const kept: FretPosition[] = []
  let allInRange = true
  for (const n of notes) {
    if (n.s === undefined) {
      allInRange = false
      break
    }
    const fret = n.p + offset - GUITAR_STANDARD[n.s]
    if (fret < 0 || fret > MAX_FRET) {
      allInRange = false
      break
    }
    kept.push({ string: n.s, fret })
  }
  if (allInRange && kept.length === notes.length) return kept

  // Forsøk 2: deterministisk om-fingring av hele licken.
  const refingered: FretPosition[] = []
  let prev: FretPosition | undefined
  for (const n of notes) {
    const pitch = n.p + offset
    const pos = bestPosition(pitch, GUITAR_STANDARD, prev, MAX_FRET)
    if (pos) {
      refingered.push(pos)
      prev = pos
    } else {
      // Utenfor halsen selv etter om-fingring: klem båndet inn på nærmeste
      // streng slik at invarianten (p = tuning[s] + f) fortsatt kan holde ved
      // rendering. Ekstremt sjeldent for reelt gitar-innhold.
      const s = n.s ?? 0
      refingered.push({ string: s, fret: Math.max(0, Math.min(MAX_FRET, pitch - GUITAR_STANDARD[s])) })
    }
  }
  return refingered
}

/**
 * Foreslå streng `s` for hver note ved forfatting (D8). Kjør per hånd en
 * bestPosition-kjede i tid — melodi (R) og bass (L) fingersettes uavhengig så de
 * ikke drar hverandre ut av posisjon. Returnerer NYE noter med `s` satt;
 * inn-notene røres ikke. Forfatteren hånd-justerer forslaget etterpå.
 */
export function assignStrings(notes: LickNote[]): LickNote[] {
  const prevByHand: Partial<Record<LickNote['h'], FretPosition | undefined>> = {}
  // Behold original rekkefølge, men kjed kontinuitet i tidsrekkefølge per hånd.
  const order = notes.map((n, i) => i).sort((a, b) => notes[a].t - notes[b].t)
  const assigned = new Array<number | undefined>(notes.length)
  for (const i of order) {
    const n = notes[i]
    const pos = bestPosition(n.p, GUITAR_STANDARD, prevByHand[n.h], MAX_FRET)
    if (pos) {
      assigned[i] = pos.string
      prevByHand[n.h] = pos
    } else {
      assigned[i] = undefined
    }
  }
  return notes.map((n, i) => (assigned[i] === undefined ? { ...n } : { ...n, s: assigned[i] }))
}
