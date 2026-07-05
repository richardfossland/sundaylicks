import type { SeedLick } from '@/types/lick'

// ── Curated seed licks (source of truth) ─────────────────────────────────────
// Authored as MIDI data (pitch + timing in beats). C4 = 60. Right hand = melody,
// left hand = bass/voicing. `scripts/seed.mjs` validates these with zod and
// upserts them into `licks.licks`; the app reads from Supabase and falls back to
// this array when the DB is unreachable, so this file stays canonical.
//
// original_key is a pitch class (0 = C). Chord roots/bass are pitch classes in
// the lick's ORIGINAL key; transposition is applied at render/playback time.

export const SEED_LICKS: SeedLick[] = [
  // 1 ── Gospel walk-up: chromatic walking bass (F→F#→G) under simple triads,
  //      a warm I–IV–V–I intro. C major, beginner.
  {
    slug: 'gospel-walk-up',
    name: 'Gospel walk-up',
    description:
      'Varm intro med kromatisk gående bass (F–F#–G) under enkle treklanger. I–IV–V–I i C. Perfekt oppstart før en lovsang.',
    category: 'intro',
    difficulty: 1,
    original_key: 0,
    default_bpm: 80,
    beats: 8,
    time_signature: '4/4',
    notes: [
      // LH — walking bass, one note per beat
      { p: 36, t: 0, d: 1, h: 'L' },
      { p: 40, t: 1, d: 1, h: 'L' },
      { p: 41, t: 2, d: 1, h: 'L' },
      { p: 42, t: 3, d: 1, h: 'L' },
      { p: 43, t: 4, d: 1, h: 'L' },
      { p: 47, t: 5, d: 1, h: 'L' },
      { p: 48, t: 6, d: 1, h: 'L' },
      { p: 43, t: 7, d: 1, h: 'L' },
      // RH — chord tones on the downbeats
      { p: 64, t: 0, d: 2, h: 'R' }, { p: 67, t: 0, d: 2, h: 'R' }, { p: 72, t: 0, d: 2, h: 'R' },
      { p: 65, t: 2, d: 2, h: 'R' }, { p: 69, t: 2, d: 2, h: 'R' }, { p: 72, t: 2, d: 2, h: 'R' },
      { p: 65, t: 4, d: 2, h: 'R' }, { p: 67, t: 4, d: 2, h: 'R' }, { p: 71, t: 4, d: 2, h: 'R' },
      { p: 64, t: 6, d: 2, h: 'R' }, { p: 67, t: 6, d: 2, h: 'R' }, { p: 72, t: 6, d: 2, h: 'R' },
    ],
    chords: [
      { t: 0, d: 2, r: 0, q: '' },
      { t: 2, d: 2, r: 5, q: '' },
      { t: 4, d: 2, r: 7, q: '7' },
      { t: 6, d: 2, r: 0, q: '' },
    ],
    tags: ['gospel', 'intro', 'bass', 'nybegynner'],
  },

  // 2 ── 2-5-1 run: Dm7–G7–Cmaj7 with an eighth-note bebop/gospel line resolving
  //      down into a Cmaj7 voicing. C major, intermediate.
  {
    slug: 'two-five-one-run',
    name: '2-5-1-run',
    description:
      'Klassisk ii–V–I: Dm7–G7–Cmaj7 med en åttendedels-linje som løser seg ned i en Cmaj7-voicing. Byggesteinen i jazz og gospel.',
    category: 'two-five-one',
    difficulty: 2,
    original_key: 0,
    default_bpm: 96,
    beats: 8,
    time_signature: '4/4',
    notes: [
      // RH — Dm7 arpeggio
      { p: 62, t: 0, d: 0.5, h: 'R' },
      { p: 65, t: 0.5, d: 0.5, h: 'R' },
      { p: 69, t: 1, d: 0.5, h: 'R' },
      { p: 72, t: 1.5, d: 0.5, h: 'R' },
      // RH — G7 colour
      { p: 71, t: 2, d: 0.5, h: 'R' },
      { p: 74, t: 2.5, d: 0.5, h: 'R' },
      { p: 77, t: 3, d: 0.5, h: 'R' },
      { p: 74, t: 3.5, d: 0.5, h: 'R' },
      // RH — resolution into Cmaj7
      { p: 76, t: 4, d: 0.5, h: 'R' },
      { p: 74, t: 4.5, d: 0.5, h: 'R' },
      { p: 72, t: 5, d: 1, h: 'R' },
      { p: 64, t: 6, d: 2, h: 'R' }, { p: 67, t: 6, d: 2, h: 'R' }, { p: 71, t: 6, d: 2, h: 'R' }, { p: 72, t: 6, d: 2, h: 'R' },
      // LH — rootless-ish shells
      { p: 50, t: 0, d: 2, h: 'L' }, { p: 53, t: 0, d: 2, h: 'L' }, { p: 60, t: 0, d: 2, h: 'L' },
      { p: 43, t: 2, d: 2, h: 'L' }, { p: 53, t: 2, d: 2, h: 'L' }, { p: 59, t: 2, d: 2, h: 'L' },
      { p: 48, t: 4, d: 4, h: 'L' }, { p: 52, t: 4, d: 4, h: 'L' }, { p: 55, t: 4, d: 4, h: 'L' }, { p: 59, t: 4, d: 4, h: 'L' },
    ],
    chords: [
      { t: 0, d: 2, r: 2, q: 'm7' },
      { t: 2, d: 2, r: 7, q: '7' },
      { t: 4, d: 4, r: 0, q: 'maj7' },
    ],
    tags: ['jazz', 'gospel', 'ii-V-I', 'voicing'],
  },

  // 3 ── Amen ending: plagal IV–iv–I (Bb–Bbm–F). The minor-iv is the signature
  //      "amen" colour. F major, beginner.
  {
    slug: 'amen-ending',
    name: 'Amen-avslutning',
    description:
      'Den ekte gospel-«amen»: plagal IV–iv–I (Bb–Bbm–F). Moll-subdominanten (Bbm) er hemmeligheten bak den varme avslutningsklangen.',
    category: 'ending',
    difficulty: 1,
    original_key: 5,
    default_bpm: 72,
    beats: 8,
    time_signature: '4/4',
    notes: [
      // RH
      { p: 62, t: 0, d: 2, h: 'R' }, { p: 65, t: 0, d: 2, h: 'R' }, { p: 70, t: 0, d: 2, h: 'R' },
      { p: 61, t: 2, d: 2, h: 'R' }, { p: 65, t: 2, d: 2, h: 'R' }, { p: 70, t: 2, d: 2, h: 'R' },
      { p: 60, t: 4, d: 4, h: 'R' }, { p: 65, t: 4, d: 4, h: 'R' }, { p: 69, t: 4, d: 4, h: 'R' },
      // LH
      { p: 46, t: 0, d: 2, h: 'L' },
      { p: 46, t: 2, d: 2, h: 'L' },
      { p: 41, t: 4, d: 4, h: 'L' }, { p: 53, t: 4, d: 4, h: 'L' },
    ],
    chords: [
      { t: 0, d: 2, r: 10, q: '' },
      { t: 2, d: 2, r: 10, q: 'm' },
      { t: 4, d: 4, r: 5, q: '' },
    ],
    tags: ['gospel', 'amen', 'kadens', 'avslutning', 'nybegynner'],
  },

  // 4 ── Pentatonic run: two-octave G major pentatonic cascade in sixteenths
  //      over a held G triad. G major, advanced (speed).
  {
    slug: 'pentatonic-run',
    name: 'Pentatonisk run',
    description:
      'To-oktavs G-dur pentaton kaskade i sekstendeler over en holdt G-treklang. Bygg tempo gradvis — dette er en fartsøvelse.',
    category: 'run',
    difficulty: 3,
    original_key: 7,
    default_bpm: 120,
    beats: 4,
    time_signature: '4/4',
    notes: [
      // RH — 16 sixteenths: up then down the G major pentatonic
      { p: 67, t: 0, d: 0.25, h: 'R' },
      { p: 69, t: 0.25, d: 0.25, h: 'R' },
      { p: 71, t: 0.5, d: 0.25, h: 'R' },
      { p: 74, t: 0.75, d: 0.25, h: 'R' },
      { p: 76, t: 1, d: 0.25, h: 'R' },
      { p: 79, t: 1.25, d: 0.25, h: 'R' },
      { p: 81, t: 1.5, d: 0.25, h: 'R' },
      { p: 83, t: 1.75, d: 0.25, h: 'R' },
      { p: 79, t: 2, d: 0.25, h: 'R' },
      { p: 76, t: 2.25, d: 0.25, h: 'R' },
      { p: 74, t: 2.5, d: 0.25, h: 'R' },
      { p: 71, t: 2.75, d: 0.25, h: 'R' },
      { p: 69, t: 3, d: 0.25, h: 'R' },
      { p: 67, t: 3.25, d: 0.25, h: 'R' },
      { p: 62, t: 3.5, d: 0.25, h: 'R' },
      { p: 67, t: 3.75, d: 0.25, h: 'R' },
      // LH — held G triad
      { p: 43, t: 0, d: 4, h: 'L' }, { p: 47, t: 0, d: 4, h: 'L' }, { p: 50, t: 0, d: 4, h: 'L' },
    ],
    chords: [{ t: 0, d: 4, r: 7, q: '' }],
    tags: ['run', 'pentaton', 'fart', 'avansert'],
  },

  // 5 ── Worship fill: an atmospheric melodic turn over a I → IV/I pedal (D → G/D)
  //      using D major pentatonic. D major, intermediate.
  {
    slug: 'worship-fill',
    name: 'Worship-fill',
    description:
      'Luftig, syngbar fill over et I → IV/I-orgelpunkt (D → G/D) i D-dur pentaton. Fyller rommet mellom versene uten å ta over.',
    category: 'fill',
    difficulty: 2,
    original_key: 2,
    default_bpm: 76,
    beats: 8,
    time_signature: '4/4',
    notes: [
      // RH — melodic fill
      { p: 69, t: 0, d: 1, h: 'R' },
      { p: 71, t: 1, d: 0.5, h: 'R' },
      { p: 69, t: 1.5, d: 0.5, h: 'R' },
      { p: 66, t: 2, d: 1, h: 'R' },
      { p: 64, t: 3, d: 1, h: 'R' },
      { p: 66, t: 4, d: 1, h: 'R' },
      { p: 69, t: 5, d: 0.5, h: 'R' },
      { p: 71, t: 5.5, d: 0.5, h: 'R' },
      { p: 74, t: 6, d: 2, h: 'R' },
      // LH — sustained pedal voicings
      { p: 50, t: 0, d: 4, h: 'L' }, { p: 57, t: 0, d: 4, h: 'L' }, { p: 62, t: 0, d: 4, h: 'L' },
      { p: 50, t: 4, d: 4, h: 'L' }, { p: 55, t: 4, d: 4, h: 'L' }, { p: 59, t: 4, d: 4, h: 'L' },
    ],
    chords: [
      { t: 0, d: 4, r: 2, q: '' },
      { t: 4, d: 4, r: 7, q: '', b: 2 },
    ],
    tags: ['worship', 'fill', 'pentaton', 'orgelpunkt'],
  },

  // 6 ── I–vi–ii–V turnaround (C–Am–Dm–G7), the most common gospel/jazz loop.
  {
    slug: 'turnaround-1-6-2-5',
    name: 'Turnaround I–vi–ii–V',
    description: 'Den vanligste gospel-loopen: C–Am–Dm–G7. Ligg-og-repeter for å høre hvordan akkordene trekker rundt.',
    category: 'turnaround',
    difficulty: 2,
    original_key: 0,
    default_bpm: 88,
    beats: 8,
    time_signature: '4/4',
    notes: [
      { p: 64, t: 0, d: 2, h: 'R' }, { p: 67, t: 0, d: 2, h: 'R' }, { p: 72, t: 0, d: 2, h: 'R' },
      { p: 64, t: 2, d: 2, h: 'R' }, { p: 69, t: 2, d: 2, h: 'R' }, { p: 72, t: 2, d: 2, h: 'R' },
      { p: 65, t: 4, d: 2, h: 'R' }, { p: 69, t: 4, d: 2, h: 'R' }, { p: 74, t: 4, d: 2, h: 'R' },
      { p: 65, t: 6, d: 2, h: 'R' }, { p: 67, t: 6, d: 2, h: 'R' }, { p: 71, t: 6, d: 2, h: 'R' },
      { p: 36, t: 0, d: 2, h: 'L' }, { p: 45, t: 2, d: 2, h: 'L' }, { p: 38, t: 4, d: 2, h: 'L' }, { p: 43, t: 6, d: 2, h: 'L' },
    ],
    chords: [
      { t: 0, d: 2, r: 0, q: '' }, { t: 2, d: 2, r: 9, q: 'm' },
      { t: 4, d: 2, r: 2, q: 'm' }, { t: 6, d: 2, r: 7, q: '7' },
    ],
    tags: ['gospel', 'turnaround', 'akkorder'],
  },

  // 7 ── iii–vi–ii–V turnaround (Em–Am–Dm–G7), a smoother "long" turnaround.
  {
    slug: 'turnaround-3-6-2-5',
    name: 'Turnaround iii–vi–ii–V',
    description: 'Den lange turnarounden Em–Am–Dm–G7 — trinnvis fallende bass gir en mykere sirkel enn I–vi–ii–V.',
    category: 'turnaround',
    difficulty: 2,
    original_key: 0,
    default_bpm: 88,
    beats: 8,
    time_signature: '4/4',
    notes: [
      { p: 67, t: 0, d: 2, h: 'R' }, { p: 71, t: 0, d: 2, h: 'R' }, { p: 76, t: 0, d: 2, h: 'R' },
      { p: 69, t: 2, d: 2, h: 'R' }, { p: 72, t: 2, d: 2, h: 'R' }, { p: 76, t: 2, d: 2, h: 'R' },
      { p: 69, t: 4, d: 2, h: 'R' }, { p: 74, t: 4, d: 2, h: 'R' }, { p: 77, t: 4, d: 2, h: 'R' },
      { p: 71, t: 6, d: 2, h: 'R' }, { p: 74, t: 6, d: 2, h: 'R' }, { p: 77, t: 6, d: 2, h: 'R' },
      { p: 40, t: 0, d: 2, h: 'L' }, { p: 45, t: 2, d: 2, h: 'L' }, { p: 38, t: 4, d: 2, h: 'L' }, { p: 43, t: 6, d: 2, h: 'L' },
    ],
    chords: [
      { t: 0, d: 2, r: 4, q: 'm' }, { t: 2, d: 2, r: 9, q: 'm' },
      { t: 4, d: 2, r: 2, q: 'm' }, { t: 6, d: 2, r: 7, q: '7' },
    ],
    tags: ['gospel', 'turnaround', 'akkorder'],
  },

  // 8 ── vi–ii–V–I ending (Am–Dm–G7–C), rising to a bright tonic.
  {
    slug: 'ending-6-2-5-1',
    name: 'Avslutning vi–ii–V–I',
    description: 'En full kadens-avslutning Am–Dm–G7–C som lander lyst på toppen av C-akkorden.',
    category: 'ending',
    difficulty: 2,
    original_key: 0,
    default_bpm: 80,
    beats: 8,
    time_signature: '4/4',
    notes: [
      { p: 69, t: 0, d: 2, h: 'R' }, { p: 72, t: 0, d: 2, h: 'R' }, { p: 76, t: 0, d: 2, h: 'R' },
      { p: 69, t: 2, d: 2, h: 'R' }, { p: 74, t: 2, d: 2, h: 'R' }, { p: 77, t: 2, d: 2, h: 'R' },
      { p: 71, t: 4, d: 2, h: 'R' }, { p: 74, t: 4, d: 2, h: 'R' }, { p: 77, t: 4, d: 2, h: 'R' },
      { p: 72, t: 6, d: 2, h: 'R' }, { p: 76, t: 6, d: 2, h: 'R' }, { p: 79, t: 6, d: 2, h: 'R' },
      { p: 45, t: 0, d: 2, h: 'L' }, { p: 38, t: 2, d: 2, h: 'L' }, { p: 43, t: 4, d: 2, h: 'L' }, { p: 36, t: 6, d: 2, h: 'L' },
    ],
    chords: [
      { t: 0, d: 2, r: 9, q: 'm' }, { t: 2, d: 2, r: 2, q: 'm' },
      { t: 4, d: 2, r: 7, q: '7' }, { t: 6, d: 2, r: 0, q: '' },
    ],
    tags: ['gospel', 'kadens', 'avslutning'],
  },

  // 9 ── I → IV/I intro swell (G → C/G), a warm pad opener over a tonic pedal.
  {
    slug: 'intro-1-4-swell',
    name: 'Intro-swell I → IV',
    description: 'Rolig åpner: G-akkord som svulmer over til C/G over et G-orgelpunkt. La den ringe før første vers.',
    category: 'intro',
    difficulty: 1,
    original_key: 7,
    default_bpm: 70,
    beats: 8,
    time_signature: '4/4',
    notes: [
      { p: 67, t: 0, d: 4, h: 'R' }, { p: 71, t: 0, d: 4, h: 'R' }, { p: 74, t: 0, d: 4, h: 'R' },
      { p: 67, t: 4, d: 4, h: 'R' }, { p: 72, t: 4, d: 4, h: 'R' }, { p: 76, t: 4, d: 4, h: 'R' },
      { p: 43, t: 0, d: 4, h: 'L' }, { p: 43, t: 4, d: 4, h: 'L' },
    ],
    chords: [
      { t: 0, d: 4, r: 7, q: '' }, { t: 4, d: 4, r: 0, q: '', b: 7 },
    ],
    tags: ['worship', 'intro', 'orgelpunkt', 'nybegynner'],
  },

  // 10 ── C major scale cascade down, straight eighths. Finger-builder.
  {
    slug: 'run-major-cascade',
    name: 'Dur-skala kaskade',
    description: 'C-dur skala fallende i åttendedeler over en holdt C-akkord. Enkel byggekloss for jevne løp.',
    category: 'run',
    difficulty: 1,
    original_key: 0,
    default_bpm: 100,
    beats: 4,
    time_signature: '4/4',
    notes: [
      { p: 72, t: 0, d: 0.5, h: 'R' }, { p: 71, t: 0.5, d: 0.5, h: 'R' },
      { p: 69, t: 1, d: 0.5, h: 'R' }, { p: 67, t: 1.5, d: 0.5, h: 'R' },
      { p: 65, t: 2, d: 0.5, h: 'R' }, { p: 64, t: 2.5, d: 0.5, h: 'R' },
      { p: 62, t: 3, d: 0.5, h: 'R' }, { p: 60, t: 3.5, d: 0.5, h: 'R' },
      { p: 48, t: 0, d: 4, h: 'L' }, { p: 52, t: 0, d: 4, h: 'L' }, { p: 55, t: 0, d: 4, h: 'L' },
    ],
    chords: [{ t: 0, d: 4, r: 0, q: '' }],
    tags: ['run', 'skala', 'nybegynner'],
  },

  // 11 ── Bb blues-scale run — the bluesy colour of gospel piano.
  {
    slug: 'run-blues-bb',
    name: 'Blues-run i Bb',
    description: 'Bb blues-skala opp og ned (med senket kvint) over en Bb7. Gir gospelpianoet det bluesy stenket.',
    category: 'run',
    difficulty: 2,
    original_key: 10,
    default_bpm: 96,
    beats: 4,
    time_signature: '4/4',
    notes: [
      { p: 70, t: 0, d: 0.5, h: 'R' }, { p: 73, t: 0.5, d: 0.5, h: 'R' },
      { p: 75, t: 1, d: 0.5, h: 'R' }, { p: 76, t: 1.5, d: 0.5, h: 'R' },
      { p: 77, t: 2, d: 0.5, h: 'R' }, { p: 75, t: 2.5, d: 0.5, h: 'R' },
      { p: 73, t: 3, d: 0.5, h: 'R' }, { p: 70, t: 3.5, d: 0.5, h: 'R' },
      { p: 46, t: 0, d: 4, h: 'L' }, { p: 53, t: 0, d: 4, h: 'L' },
    ],
    chords: [{ t: 0, d: 4, r: 10, q: '7' }],
    tags: ['run', 'blues', 'gospel'],
  },

  // 12 ── I–VI7–ii–V turnaround in F (F–D7–Gm–C7), a secondary-dominant loop.
  {
    slug: 'turnaround-secondary-f',
    name: 'Turnaround med bidominant',
    description: 'F–D7–Gm–C7: D7 er en bidominant som skyver ekstra hardt mot Gm. Klassisk gospel-sirkel i F.',
    category: 'turnaround',
    difficulty: 2,
    original_key: 5,
    default_bpm: 90,
    beats: 8,
    time_signature: '4/4',
    notes: [
      { p: 65, t: 0, d: 2, h: 'R' }, { p: 69, t: 0, d: 2, h: 'R' }, { p: 72, t: 0, d: 2, h: 'R' },
      { p: 66, t: 2, d: 2, h: 'R' }, { p: 69, t: 2, d: 2, h: 'R' }, { p: 72, t: 2, d: 2, h: 'R' },
      { p: 67, t: 4, d: 2, h: 'R' }, { p: 70, t: 4, d: 2, h: 'R' }, { p: 74, t: 4, d: 2, h: 'R' },
      { p: 64, t: 6, d: 2, h: 'R' }, { p: 70, t: 6, d: 2, h: 'R' }, { p: 72, t: 6, d: 2, h: 'R' },
      { p: 41, t: 0, d: 2, h: 'L' }, { p: 38, t: 2, d: 2, h: 'L' }, { p: 43, t: 4, d: 2, h: 'L' }, { p: 48, t: 6, d: 2, h: 'L' },
    ],
    chords: [
      { t: 0, d: 2, r: 5, q: '' }, { t: 2, d: 2, r: 2, q: '7' },
      { t: 4, d: 2, r: 7, q: 'm' }, { t: 6, d: 2, r: 0, q: '7' },
    ],
    tags: ['gospel', 'turnaround', 'bidominant'],
  },

  // 13 ── Plagal ending in D (G/D → D), a gentle "amen" over a tonic pedal.
  {
    slug: 'ending-plagal-d',
    name: 'Plagal avslutning i D',
    description: 'Mild IV → I (G/D → D) over et D-orgelpunkt. Den enkleste, varmeste måten å lande en lovsang.',
    category: 'ending',
    difficulty: 1,
    original_key: 2,
    default_bpm: 72,
    beats: 8,
    time_signature: '4/4',
    notes: [
      { p: 67, t: 0, d: 4, h: 'R' }, { p: 71, t: 0, d: 4, h: 'R' }, { p: 74, t: 0, d: 4, h: 'R' },
      { p: 66, t: 4, d: 4, h: 'R' }, { p: 69, t: 4, d: 4, h: 'R' }, { p: 74, t: 4, d: 4, h: 'R' },
      { p: 38, t: 0, d: 4, h: 'L' }, { p: 50, t: 0, d: 4, h: 'L' },
      { p: 38, t: 4, d: 4, h: 'L' }, { p: 45, t: 4, d: 4, h: 'L' },
    ],
    chords: [
      { t: 0, d: 4, r: 7, q: '', b: 2 }, { t: 4, d: 4, r: 2, q: '' },
    ],
    tags: ['worship', 'plagal', 'avslutning', 'nybegynner'],
  },

  // 14 ── Minor ii–V–i (Bm7b5–E7–Am), the essential minor cadence.
  {
    slug: 'two-five-one-minor',
    name: 'Moll 2-5-1',
    description: 'Moll-kadensen Bm7b5–E7–Am. Den halvformminskede iiø og E7 gir den mørke, lengtende gospelfargen.',
    category: 'two-five-one',
    difficulty: 3,
    original_key: 9,
    default_bpm: 92,
    beats: 8,
    time_signature: '4/4',
    notes: [
      { p: 71, t: 0, d: 2, h: 'R' }, { p: 74, t: 0, d: 2, h: 'R' }, { p: 77, t: 0, d: 2, h: 'R' },
      { p: 68, t: 2, d: 2, h: 'R' }, { p: 71, t: 2, d: 2, h: 'R' }, { p: 74, t: 2, d: 2, h: 'R' },
      { p: 69, t: 4, d: 4, h: 'R' }, { p: 72, t: 4, d: 4, h: 'R' }, { p: 76, t: 4, d: 4, h: 'R' },
      { p: 47, t: 0, d: 2, h: 'L' }, { p: 40, t: 2, d: 2, h: 'L' }, { p: 45, t: 4, d: 4, h: 'L' },
    ],
    chords: [
      { t: 0, d: 2, r: 11, q: 'm7b5' }, { t: 2, d: 2, r: 4, q: '7' }, { t: 4, d: 4, r: 9, q: 'm' },
    ],
    tags: ['jazz', 'moll', 'ii-V-i', 'avansert'],
  },

  // 15 ── A major arpeggio fill (up and back), a bright shimmer between phrases.
  {
    slug: 'fill-arp-a',
    name: 'Arpeggio-fill i A',
    description: 'A-dur arpeggio opp til A5 og tilbake — et lyst glimt å fylle mellom to linjer med.',
    category: 'fill',
    difficulty: 1,
    original_key: 9,
    default_bpm: 76,
    beats: 8,
    time_signature: '4/4',
    notes: [
      { p: 69, t: 0, d: 1, h: 'R' }, { p: 73, t: 1, d: 1, h: 'R' },
      { p: 76, t: 2, d: 1, h: 'R' }, { p: 81, t: 3, d: 1, h: 'R' },
      { p: 76, t: 4, d: 1, h: 'R' }, { p: 73, t: 5, d: 1, h: 'R' }, { p: 69, t: 6, d: 2, h: 'R' },
      { p: 45, t: 0, d: 4, h: 'L' }, { p: 52, t: 0, d: 4, h: 'L' }, { p: 57, t: 0, d: 4, h: 'L' },
      { p: 45, t: 4, d: 4, h: 'L' }, { p: 52, t: 4, d: 4, h: 'L' }, { p: 57, t: 4, d: 4, h: 'L' },
    ],
    chords: [
      { t: 0, d: 4, r: 9, q: '' }, { t: 4, d: 4, r: 9, q: '' },
    ],
    tags: ['worship', 'fill', 'arpeggio', 'nybegynner'],
  },

  // 16 ── vi–ii–V–I intro in Eb (Cm–Fm–Bb7–Eb), a gospel four-chord setup.
  {
    slug: 'intro-6-2-5-1-eb',
    name: 'Intro vi–ii–V–I i Eb',
    description: 'Cm–Fm–Bb7–Eb — en firetakters gospel-oppbygning som setter tonearten før sangen starter.',
    category: 'intro',
    difficulty: 2,
    original_key: 3,
    default_bpm: 84,
    beats: 8,
    time_signature: '4/4',
    notes: [
      { p: 63, t: 0, d: 2, h: 'R' }, { p: 67, t: 0, d: 2, h: 'R' }, { p: 72, t: 0, d: 2, h: 'R' },
      { p: 65, t: 2, d: 2, h: 'R' }, { p: 68, t: 2, d: 2, h: 'R' }, { p: 72, t: 2, d: 2, h: 'R' },
      { p: 65, t: 4, d: 2, h: 'R' }, { p: 68, t: 4, d: 2, h: 'R' }, { p: 74, t: 4, d: 2, h: 'R' },
      { p: 67, t: 6, d: 2, h: 'R' }, { p: 70, t: 6, d: 2, h: 'R' }, { p: 75, t: 6, d: 2, h: 'R' },
      { p: 36, t: 0, d: 2, h: 'L' }, { p: 41, t: 2, d: 2, h: 'L' }, { p: 46, t: 4, d: 2, h: 'L' }, { p: 39, t: 6, d: 2, h: 'L' },
    ],
    chords: [
      { t: 0, d: 2, r: 0, q: 'm' }, { t: 2, d: 2, r: 5, q: 'm' },
      { t: 4, d: 2, r: 10, q: '7' }, { t: 6, d: 2, r: 3, q: '' },
    ],
    tags: ['gospel', 'intro', 'akkorder'],
  },

  // 17 ── C major pentatonic run, up and down — safe, singable, always works.
  {
    slug: 'run-pentatonic-c',
    name: 'Pentaton run i C',
    description: 'C-dur pentaton opp og ned i åttendedeler. De fem trygge tonene som alltid låter — bygg tempo på denne.',
    category: 'run',
    difficulty: 2,
    original_key: 0,
    default_bpm: 104,
    beats: 4,
    time_signature: '4/4',
    notes: [
      { p: 72, t: 0, d: 0.5, h: 'R' }, { p: 74, t: 0.5, d: 0.5, h: 'R' },
      { p: 76, t: 1, d: 0.5, h: 'R' }, { p: 79, t: 1.5, d: 0.5, h: 'R' },
      { p: 81, t: 2, d: 0.5, h: 'R' }, { p: 79, t: 2.5, d: 0.5, h: 'R' },
      { p: 76, t: 3, d: 0.5, h: 'R' }, { p: 72, t: 3.5, d: 0.5, h: 'R' },
      { p: 48, t: 0, d: 4, h: 'L' }, { p: 52, t: 0, d: 4, h: 'L' }, { p: 55, t: 0, d: 4, h: 'L' },
    ],
    chords: [{ t: 0, d: 4, r: 0, q: '' }],
    tags: ['run', 'pentaton', 'skala'],
  },

  // 18 ── Amen ending in G (C–Cm–G), the minor-iv "amen" in a second key.
  {
    slug: 'amen-ending-g',
    name: 'Amen-avslutning i G',
    description: 'Samme plagale «amen» (IV–iv–I) i G: C–Cm–G. Øv den i flere tonearter så den sitter i fingrene.',
    category: 'ending',
    difficulty: 1,
    original_key: 7,
    default_bpm: 72,
    beats: 8,
    time_signature: '4/4',
    notes: [
      { p: 64, t: 0, d: 2, h: 'R' }, { p: 67, t: 0, d: 2, h: 'R' }, { p: 72, t: 0, d: 2, h: 'R' },
      { p: 63, t: 2, d: 2, h: 'R' }, { p: 67, t: 2, d: 2, h: 'R' }, { p: 72, t: 2, d: 2, h: 'R' },
      { p: 62, t: 4, d: 4, h: 'R' }, { p: 67, t: 4, d: 4, h: 'R' }, { p: 71, t: 4, d: 4, h: 'R' },
      { p: 36, t: 0, d: 2, h: 'L' }, { p: 36, t: 2, d: 2, h: 'L' }, { p: 43, t: 4, d: 4, h: 'L' },
    ],
    chords: [
      { t: 0, d: 2, r: 0, q: '' }, { t: 2, d: 2, r: 0, q: 'm' }, { t: 4, d: 4, r: 7, q: '' },
    ],
    tags: ['gospel', 'amen', 'avslutning', 'nybegynner'],
  },

  // 19 ── I–vi–ii–V turnaround in Bb (Bb–Gm–Cm–F7).
  {
    slug: 'turnaround-1-6-2-5-bb',
    name: 'Turnaround I–vi–ii–V i Bb',
    description: 'Bb–Gm–Cm–F7 — samme loop som i C, men i Bb der mange lovsanger faktisk ligger. Transponér og sammenlign.',
    category: 'turnaround',
    difficulty: 2,
    original_key: 10,
    default_bpm: 88,
    beats: 8,
    time_signature: '4/4',
    notes: [
      { p: 62, t: 0, d: 2, h: 'R' }, { p: 65, t: 0, d: 2, h: 'R' }, { p: 70, t: 0, d: 2, h: 'R' },
      { p: 62, t: 2, d: 2, h: 'R' }, { p: 67, t: 2, d: 2, h: 'R' }, { p: 70, t: 2, d: 2, h: 'R' },
      { p: 63, t: 4, d: 2, h: 'R' }, { p: 67, t: 4, d: 2, h: 'R' }, { p: 72, t: 4, d: 2, h: 'R' },
      { p: 63, t: 6, d: 2, h: 'R' }, { p: 65, t: 6, d: 2, h: 'R' }, { p: 69, t: 6, d: 2, h: 'R' },
      { p: 46, t: 0, d: 2, h: 'L' }, { p: 43, t: 2, d: 2, h: 'L' }, { p: 48, t: 4, d: 2, h: 'L' }, { p: 41, t: 6, d: 2, h: 'L' },
    ],
    chords: [
      { t: 0, d: 2, r: 10, q: '' }, { t: 2, d: 2, r: 7, q: 'm' },
      { t: 4, d: 2, r: 0, q: 'm' }, { t: 6, d: 2, r: 5, q: '7' },
    ],
    tags: ['gospel', 'turnaround', 'akkorder'],
  },

  // 20 ── Worship fill in E over I → IV/E pedal, E major pentatonic melody.
  {
    slug: 'fill-worship-e',
    name: 'Worship-fill i E',
    description: 'Syngbar fill i E-dur pentaton over et E → A/E-orgelpunkt. En av de mest brukte toneartene på lovsangsscenen.',
    category: 'fill',
    difficulty: 2,
    original_key: 4,
    default_bpm: 74,
    beats: 8,
    time_signature: '4/4',
    notes: [
      { p: 71, t: 0, d: 1, h: 'R' }, { p: 73, t: 1, d: 0.5, h: 'R' }, { p: 71, t: 1.5, d: 0.5, h: 'R' },
      { p: 68, t: 2, d: 1, h: 'R' }, { p: 66, t: 3, d: 1, h: 'R' },
      { p: 68, t: 4, d: 1, h: 'R' }, { p: 71, t: 5, d: 0.5, h: 'R' }, { p: 73, t: 5.5, d: 0.5, h: 'R' },
      { p: 76, t: 6, d: 2, h: 'R' },
      { p: 52, t: 0, d: 4, h: 'L' }, { p: 59, t: 0, d: 4, h: 'L' }, { p: 64, t: 0, d: 4, h: 'L' },
      { p: 52, t: 4, d: 4, h: 'L' }, { p: 57, t: 4, d: 4, h: 'L' }, { p: 61, t: 4, d: 4, h: 'L' },
    ],
    chords: [
      { t: 0, d: 4, r: 4, q: '' }, { t: 4, d: 4, r: 9, q: '', b: 4 },
    ],
    tags: ['worship', 'fill', 'pentaton', 'orgelpunkt'],
  },
]
