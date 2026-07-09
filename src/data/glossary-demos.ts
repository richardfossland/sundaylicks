// Interaktive demoer for oppslagsverket (W1). REN DATA — ingen JSX, ingen
// Tone-import. Denne fila importeres både av node-testene (glossary-demos.test.ts)
// og statisk av <Term> (for «hør et eksempel»-lenketeksten) og badge-visningen i
// GlossaryBrowser, så den MÅ holdes fri for alt som drar inn AudioContext/Tone.
//
// INVARIANT: importer bare typer + rene teori-hjelpere. `voicing()`
// (theory/voicings.ts), `chordPitchClasses`/`pitchClass` (music.ts) og
// `nearestOffset` (transpose.ts) er alle rene MIDI-genereratorer uten lyd — de er
// den eneste avhengighetskjeden denne fila har lov til å ha. Selve avspillingen
// skjer i DemoBlock/useDemoPlayer, som lastes `dynamic({ ssr:false })`.
//
// Modellen: hver demo er knyttet til én oppslagsverk-oppføring via `termId` og
// beskriver et lite, konkret C-dur-eksempel nær C4 som matcher bodyteksten.
// Fire former:
//   • keyboard    — ett akkord/skala-grep vist på MiniKeyboard, spilles som
//                    blokk eller arpeggio.
//   • progression — en liten akkordrekke på et taktgrid (ChordStrip + tangenter
//                    som følger aktiv akkord).
//   • ab          — 2–4 varianter å bla mellom og sammenligne (A/B), hver enten
//                    et grep (chord) eller en liten frase (phrase).
//   • circle      — interaktiv kvintsirkel (klikk toneart → hør tonika).

import type { Hand } from '@/types/lick'
import { voicing, type VoicingStyle } from '@/lib/theory/voicings'

// ── Typer ────────────────────────────────────────────────────────────────────

/** Et statisk grep — et sett MIDI-toner vist (og spilt) samtidig eller brutt. */
export interface DemoChord {
  /** MIDI-toner (21–108), typisk nær C4 = 60. */
  pitches: number[]
  /** Grunntonens tone-klasse (0–11). Tangenter med denne klassen males amber. */
  root?: number
  /** Valgfrie etiketter under enkelttangenter (MIDI → kort tekst, f.eks. «3»). */
  labels?: Record<number, string>
  /** true = spill tonene etter hverandre (skala/arpeggio) i stedet for som blokk. */
  arpeggiate?: boolean
}

/** En liten tidsstyrt frase — bygges til en in-memory Lick og spilles via motoren. */
export interface DemoPhrase {
  /** Total lengde i slag. */
  beats: number
  /** Tempo (default 90). */
  bpm?: number
  /** Swing 0–1 (0 = rett, ~0.5 = jazz-swing). build() nullstiller Transport.swing. */
  swing?: number
  notes: { p: number; t: number; d: number; h?: Hand; v?: number }[]
  /** Akkordsymboler til ChordStrip (roots er tone-klasser 0–11). */
  chords?: { t: number; d: number; r: number; q: string; b?: number }[]
}

/** Én variant i en A/B-demo — nøyaktig én av chord/phrase. */
export interface DemoVariant {
  label: string
  chord?: DemoChord
  phrase?: DemoPhrase
}

export type GlossaryDemo =
  | { kind: 'keyboard'; termId: string; caption: string; chord: DemoChord }
  | { kind: 'progression'; termId: string; caption: string; phrase: DemoPhrase }
  | { kind: 'ab'; termId: string; caption: string; variants: DemoVariant[] }
  | { kind: 'circle'; termId: string; caption: string }

// ── Interne buildere (holder registryet deklarativt) ─────────────────────────

/**
 * Et grep fra voicing()-motoren. `labels` er justert etter voicingens toner i
 * stigende rekkefølge (voicing() returnerer alltid sortert), så ['Grunntone',
 * '3', '7'] havner på riktig tangent uten at vi må kjenne MIDI-tallene her.
 */
function chordDemo(root: number, quality: string, style: VoicingStyle, labels?: string[]): DemoChord {
  const pitches = voicing(root, quality, style)
  let labelMap: Record<number, string> | undefined
  if (labels) {
    labelMap = {}
    pitches.forEach((p, i) => {
      if (labels[i]) labelMap![p] = labels[i]
    })
  }
  return { pitches, root, labels: labelMap }
}

interface ProgStep {
  root: number
  quality: string
  style?: VoicingStyle
}

/**
 * Legg en akkordrekke ut på et taktgrid som blokk-voicinger + ChordStrip-symboler.
 * Brukes av progression-demoene og av enkle A/B-fraser (ii-V-I osv).
 */
function chordPhrase(steps: ProgStep[], beatsPerChord = 2, bpm = 90): DemoPhrase {
  const notes: DemoPhrase['notes'] = []
  const chords: NonNullable<DemoPhrase['chords']> = []
  steps.forEach((s, i) => {
    const t = i * beatsPerChord
    for (const p of voicing(s.root, s.quality, s.style ?? 'close')) {
      notes.push({ p, t, d: beatsPerChord, h: 'R', v: 0.75 })
    }
    chords.push({ t, d: beatsPerChord, r: s.root, q: s.quality })
  })
  return { beats: steps.length * beatsPerChord, bpm, notes, chords }
}

interface LineOpts {
  beats?: number
  bpm?: number
  swing?: number
  chords?: NonNullable<DemoPhrase['chords']>
}

/**
 * En fri notesekvens (melodilinje, brutt arpeggio, eller manuelt stemte
 * blokk-akkorder der voicing() ikke dekker kvaliteten — flere toner deler bare
 * samme t/d). `beats` utledes fra siste note hvis ikke oppgitt.
 */
function line(notes: { p: number; t: number; d: number; h?: Hand; v?: number }[], opts: LineOpts = {}): DemoPhrase {
  const beats = opts.beats ?? Math.max(...notes.map((n) => n.t + n.d))
  return {
    beats,
    bpm: opts.bpm ?? 90,
    swing: opts.swing,
    notes: notes.map((n) => ({ p: n.p, t: n.t, d: n.d, h: n.h ?? 'R', v: n.v ?? 0.8 })),
    chords: opts.chords,
  }
}

/** Et blokk-grep (alle toner samtidig) på ett tidspunkt — for manuelt stemte fraser. */
function block(pitches: number[], t: number, d: number, v = 0.75) {
  return pitches.map((p) => ({ p, t, d, v }))
}

// ── Registryet: 36 demoer ────────────────────────────────────────────────────

export const GLOSSARY_DEMOS: GlossaryDemo[] = [
  // ───────────────────────────── keyboard (11) ─────────────────────────────
  {
    kind: 'keyboard',
    termId: 'shell-voicing',
    caption:
      'Shell-voicing: bare grunntone, ters og septim — akkordens skjelett. Trykk på tangentene for å høre hver tone.',
    chord: chordDemo(0, 'maj7', 'shell', ['Grunntone', '3', '7']),
  },
  {
    kind: 'keyboard',
    termId: 'rootless-voicing',
    caption: 'Rotløs voicing: grunntonen (C) er sløyfet — bassen tar den. Igjen står fargetonene 3-5-7-9.',
    chord: chordDemo(0, 'maj7', 'rootless-a', ['3', '5', '7', '9']),
  },
  {
    kind: 'keyboard',
    termId: 'kvartal-voicing',
    caption: 'Kvartal-voicing: toner stablet i rene kvarter gir en åpen, moderne klang.',
    chord: chordDemo(0, 'maj7', 'quartal'),
  },
  {
    kind: 'keyboard',
    termId: 'akkordtoner',
    caption: 'Akkordtonene i Cmaj7: grunntone (1), ters (3), kvint (5) og septim (7).',
    chord: chordDemo(0, 'maj7', 'close', ['1', '3', '5', '7']),
  },
  {
    kind: 'keyboard',
    termId: 'intervall',
    caption: 'Et intervall er avstanden mellom to toner. Her: C opp til E — en stor ters.',
    chord: { pitches: [60, 64], root: 0, labels: { 60: 'C', 64: 'E' } },
  },
  {
    kind: 'keyboard',
    termId: 'oktav',
    caption: 'En oktav: samme tone åtte hvite trinn opp. C til C.',
    chord: { pitches: [60, 72], root: 0, labels: { 60: 'C', 72: 'C' } },
  },
  {
    kind: 'keyboard',
    termId: 'oktavdobling',
    caption: 'Oktavdobling: grunntonen C spilles i to oktaver samtidig for ekstra fylde.',
    chord: { pitches: [60, 64, 67, 72], root: 0, labels: { 60: 'C', 72: 'C' } },
  },
  {
    kind: 'keyboard',
    termId: 'skala',
    caption: 'C-dur-skala, spilt tone for tone oppover.',
    chord: { pitches: [60, 62, 64, 65, 67, 69, 71, 72], root: 0, arpeggiate: true },
  },
  {
    kind: 'keyboard',
    termId: 'pentatonskala',
    caption: 'C-dur-pentaton: fem toner uten halvtoner å snuble i.',
    chord: { pitches: [60, 62, 64, 67, 69, 72], root: 0, arpeggiate: true },
  },
  {
    kind: 'keyboard',
    termId: 'blues-skala',
    caption: 'Blues-skala i C, med den karakteristiske «blå» tonen (Gb).',
    chord: { pitches: [60, 63, 65, 66, 67, 70, 72], root: 0, arpeggiate: true },
  },
  {
    kind: 'keyboard',
    termId: 'kromatisk',
    caption: 'Kromatisk: alle tolv halvtonene etter hverandre, fra C til C.',
    chord: { pitches: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72], root: 0, arpeggiate: true },
  },

  // ─────────────────────────────── ab (15) ─────────────────────────────────
  {
    kind: 'ab',
    termId: 'voicing',
    caption: 'Samme Cmaj7 — tett samlet eller spredt over to hender. Bytt og hør forskjellen.',
    variants: [
      { label: 'Tett', chord: chordDemo(0, 'maj7', 'close') },
      { label: 'Spredt', chord: chordDemo(0, 'maj7', 'gospel') },
    ],
  },
  {
    kind: 'ab',
    termId: 'drop-2',
    caption: 'Drop-2: ta den nest øverste tonen i en tett akkord og slipp den en oktav ned.',
    variants: [
      { label: 'Tett', chord: chordDemo(0, 'maj7', 'close') },
      { label: 'Drop-2', chord: chordDemo(0, 'maj7', 'drop2') },
    ],
  },
  {
    kind: 'ab',
    termId: 'sus-akkord',
    caption: 'En sus4 holder igjen tersen (F i stedet for E) og lengter etter å løse til dur.',
    variants: [
      { label: 'Csus4', chord: chordDemo(0, 'sus4', 'close', ['1', '4', '5']) },
      { label: 'Løser til C', phrase: chordPhrase([{ root: 0, quality: 'sus4' }, { root: 0, quality: '' }]) },
    ],
  },
  {
    kind: 'ab',
    termId: 'alterert',
    caption: 'En alterert dominant (G7alt) skrur til spenningen før den løser til C.',
    variants: [
      { label: 'G7 → C', phrase: chordPhrase([{ root: 7, quality: '7' }, { root: 0, quality: 'maj7' }]) },
      {
        label: 'G7alt → C',
        // G7alt manuelt stemt (G-B-Eb-F-Ab = 7#5b9) — kvaliteten finnes ikke i
        // TONES, så vi bygger blokka med line()/block() i stedet for voicing().
        phrase: line([...block([55, 59, 63, 65, 68], 0, 2), ...block([60, 64, 67, 71], 2, 2)], {
          beats: 4,
          chords: [
            { t: 0, d: 2, r: 7, q: '7alt' },
            { t: 2, d: 2, r: 0, q: 'maj7' },
          ],
        }),
      },
    ],
  },
  {
    kind: 'ab',
    termId: 'tritonussubstitusjon',
    caption: 'Tritonussubstitusjon: bytt G7 med Db7 — samme ledetoner, ny bass.',
    variants: [
      { label: 'G7 → C', phrase: chordPhrase([{ root: 7, quality: '7' }, { root: 0, quality: 'maj7' }]) },
      { label: 'Db7 → C', phrase: chordPhrase([{ root: 1, quality: '7' }, { root: 0, quality: 'maj7' }]) },
    ],
  },
  {
    kind: 'ab',
    termId: 'reharmonisering',
    caption: 'Reharmonisering: samme sted, rikere akkorder. Enkel kadens mot en fargelagt ii-V-I.',
    variants: [
      { label: 'Enkel', phrase: chordPhrase([{ root: 0, quality: '' }, { root: 7, quality: '' }, { root: 0, quality: '' }]) },
      {
        label: 'Reharmonisert',
        phrase: chordPhrase([
          { root: 2, quality: 'm7' },
          { root: 7, quality: '9' },
          { root: 0, quality: 'maj7' },
        ]),
      },
    ],
  },
  {
    kind: 'ab',
    termId: 'arpeggio',
    caption: 'Arpeggio: samme akkord som samlet grep eller brutt opp tone for tone.',
    variants: [
      { label: 'Samlet', chord: chordDemo(0, '', 'close') },
      {
        label: 'Brutt',
        phrase: line([
          { p: 60, t: 0, d: 1 },
          { p: 64, t: 1, d: 1 },
          { p: 67, t: 2, d: 1 },
          { p: 72, t: 3, d: 1 },
        ]),
      },
    ],
  },
  {
    kind: 'ab',
    termId: 'swing',
    caption: 'Swing: rette åttedeler mot swingede — den lange-korte gyngingen.',
    variants: [
      { label: 'Rett', phrase: eighthRun(0) },
      { label: 'Swing', phrase: eighthRun(0.5) },
    ],
  },
  {
    kind: 'ab',
    termId: 'shuffle',
    caption: 'Shuffle: en enda tyngre, triol-basert gynge enn vanlig swing.',
    variants: [
      { label: 'Rett', phrase: eighthRun(0) },
      { label: 'Shuffle', phrase: eighthRun(0.65) },
    ],
  },
  {
    kind: 'ab',
    termId: 'triol',
    caption: 'Trioler deler slaget i tre i stedet for to.',
    variants: [
      {
        label: 'Åttedeler',
        phrase: line(
          [0, 0.5, 1, 1.5].map((t) => ({ p: 60, t, d: 0.5 })),
          { beats: 2 },
        ),
      },
      {
        label: 'Trioler',
        phrase: line(
          [0, 1, 2, 3, 4, 5].map((i) => ({ p: 60, t: i / 3, d: 1 / 3 })),
          { beats: 2 },
        ),
      },
    ],
  },
  {
    kind: 'ab',
    termId: 'synkopering',
    caption: 'Synkopering: legg vekten mellom slagene i stedet for på dem.',
    variants: [
      {
        label: 'På slaget',
        phrase: line(
          [0, 1, 2, 3].map((t) => ({ p: 67, t, d: 0.5 })),
          { beats: 4 },
        ),
      },
      {
        label: 'Synkopert',
        phrase: line(
          [0.5, 1.5, 2.5, 3.5].map((t) => ({ p: 67, t, d: 0.5 })),
          { beats: 4 },
        ),
      },
    ],
  },
  {
    kind: 'ab',
    termId: 'backbeat',
    caption: 'Backbeat: aksent på slag 2 og 4 gir grooven puls.',
    variants: [
      {
        label: 'Slag 1 og 3',
        phrase: line(
          [0, 1, 2, 3].map((t) => ({ p: 67, t, d: 0.9, v: t % 2 === 0 ? 0.95 : 0.4 })),
          { beats: 4 },
        ),
      },
      {
        label: 'Slag 2 og 4',
        phrase: line(
          [0, 1, 2, 3].map((t) => ({ p: 67, t, d: 0.9, v: t % 2 === 1 ? 0.95 : 0.4 })),
          { beats: 4 },
        ),
      },
    ],
  },
  {
    kind: 'ab',
    termId: 'laid-back',
    caption: 'Laid-back: spill litt bak slaget for en avslappet følelse.',
    variants: [
      {
        label: 'På slaget',
        phrase: line(
          [0, 1, 2, 3].map((t) => ({ p: 64, t, d: 0.8 })),
          { beats: 4 },
        ),
      },
      {
        label: 'Laid-back',
        phrase: line(
          [0, 1, 2, 3].map((t) => ({ p: 64, t: t + 0.08, d: 0.8 })),
          { beats: 4.2 },
        ),
      },
    ],
  },
  {
    kind: 'ab',
    termId: 'grace-note',
    caption: 'Grace-note: en rask forslagstone som glir inn i måltonen.',
    variants: [
      { label: 'Uten', phrase: line([{ p: 60, t: 1, d: 1 }], { beats: 2 }) },
      {
        label: 'Med',
        phrase: line(
          [
            { p: 59, t: 0.85, d: 0.15, v: 0.6 },
            { p: 60, t: 1, d: 1 },
          ],
          { beats: 2 },
        ),
      },
    ],
  },
  {
    kind: 'ab',
    termId: 'akkordsymboler',
    caption: 'Akkordsymboler: C, Cm7, C7 og Cmaj7 — samme grunntone, ulik farge.',
    variants: [
      { label: 'C', chord: chordDemo(0, '', 'close') },
      { label: 'Cm7', chord: chordDemo(0, 'm7', 'close') },
      { label: 'C7', chord: chordDemo(0, '7', 'close') },
      { label: 'Cmaj7', chord: chordDemo(0, 'maj7', 'close') },
    ],
  },

  // ─────────────────────────── progression (9) ─────────────────────────────
  {
    kind: 'progression',
    termId: 'ii-v-i',
    caption: 'ii-V-I i C: Dm7 → G7 → Cmaj7, jazzens vanligste vending hjem.',
    phrase: chordPhrase([
      { root: 2, quality: 'm7' },
      { root: 7, quality: '7' },
      { root: 0, quality: 'maj7' },
    ]),
  },
  {
    kind: 'progression',
    termId: 'turnaround',
    caption: 'Turnaround: en kort runde (C-Am7-Dm7-G7) som leder tilbake til start.',
    phrase: chordPhrase([
      { root: 0, quality: '' },
      { root: 9, quality: 'm7' },
      { root: 2, quality: 'm7' },
      { root: 7, quality: '7' },
    ]),
  },
  {
    kind: 'progression',
    termId: 'kadens',
    caption: 'Kadens: F → G → C, spenning som løser til hvile.',
    phrase: chordPhrase([
      { root: 5, quality: '' },
      { root: 7, quality: '' },
      { root: 0, quality: '' },
    ]),
  },
  {
    kind: 'progression',
    termId: 'amen-kadens',
    caption: 'Amen-kadensen: F → C, den plagale «amen» på slutten av salmen.',
    phrase: chordPhrase([
      { root: 5, quality: '' },
      { root: 0, quality: '' },
    ]),
  },
  {
    kind: 'progression',
    termId: 'firegrep',
    caption: 'Fire grep som bærer utallige sanger: C-G-Am-F.',
    phrase: chordPhrase([
      { root: 0, quality: '' },
      { root: 7, quality: '' },
      { root: 9, quality: 'm' },
      { root: 5, quality: '' },
    ]),
  },
  {
    kind: 'progression',
    termId: 'sekundaerdominant',
    caption: 'Sekundærdominant: A7 «låner» dominanten til Dm7 og trekker sterkere.',
    phrase: chordPhrase([
      { root: 0, quality: '' },
      { root: 9, quality: '7' },
      { root: 2, quality: 'm7' },
      { root: 7, quality: '7' },
      { root: 0, quality: '' },
    ]),
  },
  {
    kind: 'progression',
    termId: 'gjennomgangsakkord',
    caption: 'Gjennomgangsakkord: C#dim7 glir kromatisk fra C opp til Dm7.',
    phrase: chordPhrase([
      { root: 0, quality: '' },
      { root: 1, quality: 'dim7' },
      { root: 2, quality: 'm7' },
    ]),
  },
  {
    kind: 'progression',
    termId: 'walk-up',
    caption: 'Walk-up: bassen vandrer C-D-E-F opp mot neste akkord.',
    phrase: line(
      [
        // Venstre hånd vandrer oppover, høyre holder akkorden.
        { p: 48, t: 0, d: 1, h: 'L' },
        { p: 50, t: 1, d: 1, h: 'L' },
        { p: 52, t: 2, d: 1, h: 'L' },
        { p: 53, t: 3, d: 1, h: 'L' },
        ...block([60, 64, 67], 0, 2).map((n) => ({ ...n, h: 'R' as Hand })),
        ...block([60, 65, 69], 2, 2).map((n) => ({ ...n, h: 'R' as Hand })),
      ],
      {
        beats: 4,
        chords: [
          { t: 0, d: 2, r: 0, q: '' },
          { t: 2, d: 2, r: 5, q: '' },
        ],
      },
    ),
  },
  {
    kind: 'progression',
    termId: 'gaende-bass',
    caption: 'Gående bass: en jevn firedelspuls i venstre hånd under C7.',
    phrase: line(
      [
        { p: 48, t: 0, d: 1, h: 'L' },
        { p: 52, t: 1, d: 1, h: 'L' },
        { p: 55, t: 2, d: 1, h: 'L' },
        { p: 58, t: 3, d: 1, h: 'L' },
        ...block([64, 70], 0, 4).map((n) => ({ ...n, h: 'R' as Hand })),
      ],
      {
        beats: 4,
        chords: [{ t: 0, d: 4, r: 0, q: '7' }],
      },
    ),
  },

  // ────────────────────────────── circle (1) ───────────────────────────────
  {
    kind: 'circle',
    termId: 'kvintsirkel',
    caption: 'Kvintsirkelen: klikk en toneart for å høre grunnakkorden. Nabotonene er nærmest beslektet.',
  },
]

/** Samme åttedelslinje spilt rett (swing 0) eller swinget — brukt av swing/shuffle. */
function eighthRun(swing: number): DemoPhrase {
  const scale = [60, 62, 64, 65, 67, 65, 64, 62]
  return line(
    scale.map((p, i) => ({ p, t: i * 0.5, d: 0.5 })),
    { beats: 4, swing },
  )
}

export const DEMO_BY_TERM_ID = new Map<string, GlossaryDemo>(GLOSSARY_DEMOS.map((d) => [d.termId, d]))
