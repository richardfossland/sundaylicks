import type { SeedLick } from '@/types/lick'

// ── Gitar-licks (kilde til sannhet, G2-piloter) ──────────────────────────────
// Skrevet som ren MIDI-data (tonehøyde + timing i slag), som piano-korpuset —
// men for gitar. HVER note bærer en streng `s` (0-basert: 0 = lav E … 5 = høy E),
// og båndet utledes `f = p − GUITAR_STANDARD[s]` (aldri lagret, D1b). Standard-
// stemming: s0=E2(40) s1=A2(45) s2=D3(50) s3=G3(55) s4=B3(59) s5=E4(64).
// Semantikk (D3): h:'L' = bass/tommel, h:'R' = melodi/plukk. `instrument: 'gitar'`
// får hver note validert av refineInstrument (utledet bånd må ligge i [0,15]).
//
// Dette er de to G2-pilotene; G3 utvider til 40. licks.ts og scripts/seed.mjs
// setter SEED_GITAR_LICKS etter piano-korpuset i det samlede biblioteket.

export const SEED_GITAR_LICKS: SeedLick[] = [
  // ── Pilot 1 ── Worship-komp i G: åpen-posisjon plukk med tommel-bass (L) og
  //   arpeggierte toppstemmer (R) over G–D–Em–C. Byggeklossen i akustisk lovsang.
  {
    slug: 'gitar-worship-komp-g',
    name: 'Lovsangskomp i G',
    description:
      'Rolig akustisk komp i åpen posisjon: tommelen går på bassen mens toppstemmene plukkes arpeggiert over G–D–Em–C. Den varme grunnstammen i akustisk lovsang.',
    category: 'comp',
    genre: 'worship',
    difficulty: 2,
    original_key: 7, // G
    default_bpm: 76,
    beats: 8,
    time_signature: '4/4',
    mode: 'major',
    instrument: 'gitar',
    notes: [
      // Takt 1 — G (t 0–2)
      { p: 43, t: 0, d: 1, h: 'L', v: 0.72, s: 0 }, // G2, lav E bånd 3 (tommel)
      { p: 50, t: 1, d: 1, h: 'L', v: 0.55, s: 2 }, // D3, D-streng åpen
      { p: 59, t: 0, d: 0.5, h: 'R', v: 0.6, s: 4 }, // B3, B-streng åpen
      { p: 62, t: 0.5, d: 0.5, h: 'R', v: 0.55, s: 4 }, // D4, B-streng bånd 3
      { p: 67, t: 1, d: 0.5, h: 'R', v: 0.66, s: 5 }, // G4, høy E bånd 3
      { p: 59, t: 1.5, d: 0.5, h: 'R', v: 0.5, s: 4 }, // B3
      // Takt 2 — D (t 2–4)
      { p: 50, t: 2, d: 1, h: 'L', v: 0.72, s: 2 }, // D3, D-streng åpen (tommel)
      { p: 45, t: 3, d: 1, h: 'L', v: 0.55, s: 1 }, // A2, A-streng åpen
      { p: 57, t: 2, d: 0.5, h: 'R', v: 0.6, s: 3 }, // A3, G-streng bånd 2
      { p: 62, t: 2.5, d: 0.5, h: 'R', v: 0.55, s: 4 }, // D4, B-streng bånd 3
      { p: 66, t: 3, d: 0.5, h: 'R', v: 0.66, s: 5 }, // F#4, høy E bånd 2
      { p: 57, t: 3.5, d: 0.5, h: 'R', v: 0.5, s: 3 }, // A3
      // Takt 3 — Em (t 4–6)
      { p: 40, t: 4, d: 1, h: 'L', v: 0.72, s: 0 }, // E2, lav E åpen (tommel)
      { p: 47, t: 5, d: 1, h: 'L', v: 0.55, s: 1 }, // B2, A-streng bånd 2
      { p: 55, t: 4, d: 0.5, h: 'R', v: 0.6, s: 3 }, // G3, G-streng åpen
      { p: 59, t: 4.5, d: 0.5, h: 'R', v: 0.55, s: 4 }, // B3, B-streng åpen
      { p: 64, t: 5, d: 0.5, h: 'R', v: 0.66, s: 5 }, // E4, høy E åpen
      { p: 59, t: 5.5, d: 0.5, h: 'R', v: 0.5, s: 4 }, // B3
      // Takt 4 — C (t 6–8)
      { p: 48, t: 6, d: 1, h: 'L', v: 0.72, s: 1 }, // C3, A-streng bånd 3 (tommel)
      { p: 43, t: 7, d: 1, h: 'L', v: 0.55, s: 0 }, // G2, lav E bånd 3
      { p: 64, t: 6, d: 0.5, h: 'R', v: 0.6, s: 5 }, // E4, høy E åpen
      { p: 67, t: 6.5, d: 0.5, h: 'R', v: 0.55, s: 5 }, // G4, høy E bånd 3
      { p: 64, t: 7, d: 0.5, h: 'R', v: 0.6, s: 5 }, // E4
      { p: 60, t: 7.5, d: 0.5, h: 'R', v: 0.5, s: 4 }, // C4, B-streng bånd 1
    ],
    chords: [
      { t: 0, d: 2, r: 7, q: '' }, // G
      { t: 2, d: 2, r: 2, q: '' }, // D
      { t: 4, d: 2, r: 4, q: 'm' }, // Em
      { t: 6, d: 2, r: 0, q: '' }, // C
    ],
    tags: ['gitar', 'worship', 'komp', 'fingerstyle', 'åpen-posisjon', 'nybegynner'],
  },

  // ── Pilot 2 ── Gospel lead i C: pentaton-basert enstemt linje med et par
  //   dobbeltstopp og en blå gjennomgangstone (Eb), spilt i én boks (bånd 0–8).
  {
    slug: 'gitar-gospel-lead-c',
    name: 'Gospel-lead i C',
    description:
      'Syngende gospel-lead over C: durpentaton med en blå Eb-gjennomgangstone og et par dobbeltstopp for tyngde. Alt i én boks på de høye strengene.',
    category: 'run',
    genre: 'gospel',
    difficulty: 3,
    original_key: 0, // C
    default_bpm: 88,
    beats: 8,
    time_signature: '4/4',
    mode: 'major',
    instrument: 'gitar',
    notes: [
      { p: 67, t: 0, d: 0.5, h: 'R', v: 0.7, s: 5 }, // G4, høy E bånd 3
      { p: 69, t: 0.5, d: 0.5, h: 'R', v: 0.6, s: 5 }, // A4, høy E bånd 5
      { p: 67, t: 1, d: 0.5, h: 'R', v: 0.65, s: 5 }, // G4
      { p: 64, t: 1.5, d: 0.5, h: 'R', v: 0.6, s: 5 }, // E4, høy E åpen
      // Dobbeltstopp — C/E-ters
      { p: 60, t: 2, d: 1, h: 'R', v: 0.75, s: 4 }, // C4, B-streng bånd 1
      { p: 64, t: 2, d: 1, h: 'R', v: 0.75, s: 5 }, // E4, høy E åpen
      { p: 62, t: 3, d: 0.5, h: 'R', v: 0.6, s: 4 }, // D4, B-streng bånd 3
      { p: 64, t: 3.5, d: 0.5, h: 'R', v: 0.6, s: 5 }, // E4
      { p: 67, t: 4, d: 0.5, h: 'R', v: 0.7, s: 5 }, // G4
      { p: 63, t: 4.5, d: 0.5, h: 'R', v: 0.55, s: 4 }, // Eb4 (blå tone), B-streng bånd 4
      { p: 62, t: 5, d: 0.5, h: 'R', v: 0.6, s: 4 }, // D4
      { p: 60, t: 5.5, d: 0.5, h: 'R', v: 0.6, s: 4 }, // C4
      // Dobbeltstopp — E/G på nabostrenger
      { p: 64, t: 6, d: 1, h: 'R', v: 0.75, s: 4 }, // E4, B-streng bånd 5
      { p: 67, t: 6, d: 1, h: 'R', v: 0.75, s: 5 }, // G4, høy E bånd 3
      { p: 69, t: 7, d: 0.5, h: 'R', v: 0.6, s: 5 }, // A4, høy E bånd 5
      { p: 72, t: 7.5, d: 0.5, h: 'R', v: 0.72, s: 5 }, // C5, høy E bånd 8 (topp)
    ],
    chords: [
      { t: 0, d: 2, r: 0, q: '' }, // C
      { t: 2, d: 2, r: 9, q: 'm' }, // Am
      { t: 4, d: 2, r: 5, q: '' }, // F
      { t: 6, d: 2, r: 7, q: '7' }, // G7
    ],
    tags: ['gitar', 'gospel', 'lead', 'pentaton', 'dobbeltstopp', 'avansert'],
  },
]
