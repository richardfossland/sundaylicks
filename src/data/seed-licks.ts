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
]
