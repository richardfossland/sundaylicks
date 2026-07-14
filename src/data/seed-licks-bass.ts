import type { SeedLick } from '@/types/lick'

// ── Bass-licks (kilde til sannhet, B1-piloter) ───────────────────────────────
// Skrevet som ren MIDI-data (tonehøyde + timing i slag), som piano- og gitar-
// korpuset — men for 4-strengs el-bass i standardstemming EADG. HVER note bærer
// en streng `s` (0-basert: 0 = lav E … 3 = G), og båndet utledes
// `f = p − BASS_EADG[s]` (aldri lagret, D1b). Stemming: s0=E1(28) s1=A1(33)
// s2=D2(38) s3=G2(43). Bassen er ENSTEMMIG (BD7): alle noter er `h:'R'` — det
// finnes ingen egen bass/melodi-stemme å skille. `instrument: 'bass'` får hver
// note validert av refineInstrument (s ∈ 0–3, utledet bånd i [0,15]).
//
// Dette er de to B1-pilotene; B2 utvider til ~35. licks.ts og scripts/seed.mjs
// legger SEED_BASS_LICKS etter piano- og gitar-korpuset i det samlede biblioteket.

export const SEED_BASS_LICKS: SeedLick[] = [
  // ── Pilot 1 ── Lovsangspedal i G: rot–kvint–oktav-ostinat over en G-drone.
  //   Den urokkelige grunnmuren under et rolig lovsangsvers — la den ligge helt
  //   likt, det er tryggheten som er poenget. Lav G1 på 3. bånd = tyngdepunktet.
  {
    slug: 'bass-worship-pedal-g',
    name: 'Lovsangspedal i G',
    description:
      'Rot–kvint–oktav som puster under et lovsangsvers i G: dyp G på 3. bånd, opp til kvinten D og oktaven, og hjem igjen. Ingen fyll, ingen hast — bare et fundament som ligger trygt der andre kan hvile på det.',
    category: 'groove',
    genre: 'worship',
    difficulty: 1,
    original_key: 7, // G
    default_bpm: 72,
    beats: 8,
    time_signature: '4/4',
    mode: 'major',
    instrument: 'bass',
    notes: [
      // Takt 1 — G-pedal (rot → kvint → oktav → kvint)
      { p: 31, t: 0, d: 1, h: 'R', v: 0.88, s: 0 }, // G1, lav E bånd 3 (rot, tung ener)
      { p: 38, t: 1, d: 1, h: 'R', v: 0.62, s: 2 }, // D2, D-streng åpen (kvint)
      { p: 43, t: 2, d: 1, h: 'R', v: 0.72, s: 3 }, // G2, G-streng åpen (oktav)
      { p: 38, t: 3, d: 1, h: 'R', v: 0.58, s: 2 }, // D2 (kvint)
      // Takt 2 — samme pedal, mykt fall tilbake til roten
      { p: 31, t: 4, d: 1, h: 'R', v: 0.85, s: 0 }, // G1 (rot)
      { p: 38, t: 5, d: 1, h: 'R', v: 0.62, s: 2 }, // D2 (kvint)
      { p: 43, t: 6, d: 0.5, h: 'R', v: 0.7, s: 3 }, // G2 (oktav)
      { p: 35, t: 6.5, d: 0.5, h: 'R', v: 0.5, s: 1 }, // B1, A-streng bånd 2 (tersen, gjennomgang)
      { p: 31, t: 7, d: 1, h: 'R', v: 0.6, s: 0 }, // G1 (hjem til roten)
    ],
    chords: [
      { t: 0, d: 4, r: 7, q: '' }, // G
      { t: 4, d: 4, r: 7, q: '' }, // G
    ],
    tags: ['bass', 'worship', 'pedal', 'rot-kvint', 'nybegynner'],
  },

  // ── Pilot 2 ── Gående bass i C: fjerdedels-walk gjennom ii–V–I (Dm7–G7–Cmaj7)
  //   med kromatiske approach-toner inn i hver ny akkord. Land på roten på 1,
  //   gå deg mot neste rot — B→C opp i takt 2, Eb→D ned i loopen. Jazzens motor.
  {
    slug: 'bass-walking-jazz-c',
    name: 'Gående bass i C',
    description:
      'Walking bass gjennom en ii–V–I i C: én fjerdedel per slag, roten på hvert akkordskifte, og en kromatisk nabotone som sniker deg inn i den neste — B glir opp i C, Eb glir ned i D når linja looper. Hemmeligheten er å alltid være på vei et sted.',
    category: 'two-five-one',
    genre: 'jazz',
    difficulty: 2,
    original_key: 0, // C
    default_bpm: 120,
    beats: 8,
    time_signature: '4/4',
    mode: 'major',
    instrument: 'bass',
    harmonic_function: ['ii', 'V7', 'Imaj7'],
    notes: [
      // Dm7 (t 0–2)
      { p: 38, t: 0, d: 1, h: 'R', v: 0.82, s: 2 }, // D2, D-streng åpen (rot)
      { p: 41, t: 1, d: 1, h: 'R', v: 0.66, s: 2 }, // F2, D-streng bånd 3 (moll-ters)
      // G7 (t 2–4)
      { p: 43, t: 2, d: 1, h: 'R', v: 0.82, s: 3 }, // G2, G-streng åpen (rot)
      { p: 35, t: 3, d: 1, h: 'R', v: 0.66, s: 1 }, // B1, A-streng bånd 2 (tersen → opp mot C)
      // Cmaj7 (t 4–8)
      { p: 36, t: 4, d: 1, h: 'R', v: 0.84, s: 1 }, // C2, A-streng bånd 3 (rot)
      { p: 40, t: 5, d: 1, h: 'R', v: 0.64, s: 2 }, // E2, D-streng bånd 2 (ters)
      { p: 43, t: 6, d: 1, h: 'R', v: 0.68, s: 3 }, // G2, G-streng åpen (kvint)
      { p: 39, t: 7, d: 1, h: 'R', v: 0.6, s: 2 }, // Eb2, D-streng bånd 1 (kromatisk ned → D i loopen)
    ],
    chords: [
      { t: 0, d: 2, r: 2, q: 'm7' }, // Dm7
      { t: 2, d: 2, r: 7, q: '7' }, // G7
      { t: 4, d: 4, r: 0, q: 'maj7' }, // Cmaj7
    ],
    tags: ['bass', 'jazz', 'walking-bass', 'ii-v-i', 'kromatikk'],
  },
]
