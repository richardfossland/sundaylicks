// ── Core domain types ───────────────────────────────────────────────────────
// Everything is stored as MIDI-ish data (pitches + timing in beats), never as
// audio. Tempo and transposition are therefore pure number transforms — no
// time-stretching, no pitch-shifting, no artefacts. See PLAN §1.

export type Hand = 'L' | 'R'

/** Hvilket instrument en lick er skrevet for. 'piano' er standard; 'gitar'
 * krever at hver note bærer en streng `s`. Fritekst på DB-laget (se
 * 0005_instrument.sql) — denne unionen er appens kjente sett. */
export type Instrument = 'piano' | 'gitar'

export type Category =
  | 'turnaround'
  | 'two-five-one'
  | 'run'
  | 'fill'
  | 'ending'
  | 'intro'
  | 'comp'
  | 'groove'

export type Genre =
  | 'gospel'
  | 'worship'
  | 'jazz'
  | 'blues'
  | 'boogie'
  | 'neosoul'
  | 'latin'
  | 'classical'
  | 'rock'
  | 'funk'
  | 'rnb'
  | 'stride'
  | 'country'
  | 'cinematic'

export type Difficulty = 1 | 2 | 3 // 1 = nybegynner, 2 = middels, 3 = avansert

export type LickStatus = 'published' | 'draft' | 'submitted'

/** Tonal mode the lick is written in. Free text at the DB layer (see
 * 0004_theory_metadata.sql) — this union is the app's known set. */
export type Mode = 'major' | 'minor'

/** What kind of practice item this row is. 'lick' is the default and covers
 * every hand-authored library lick; other kinds (e.g. 'transition') are
 * produced by the generated-content workstreams. Free text at the DB layer. */
export type Kind = 'lick' | 'transition' | string

/** A single note event inside a lick. */
export interface LickNote {
  p: number // MIDI pitch, 60 = C4
  t: number // start, in beats (decimals allowed: 0.5 = an eighth)
  d: number // duration, in beats
  h: Hand
  v?: number // velocity 0–1, default 0.8
  /** Gitar: strengindeks 0–5, 0-basert, 0 = lav E (MIDI 40) … 5 = høy E (64).
   * Bånd lagres ALDRI — det utledes `f = p − GUITAR_STANDARD[s]` (D1b).
   * Piano-noter har ALDRI `s`. */
  s?: number
}

/** A chord symbol shown in the chord strip and used for backing (later). */
export interface LickChord {
  t: number // start, in beats
  d: number // duration, in beats
  r: number // root as pitch class 0–11 (absolute, in the lick's original key)
  q: string // quality: '' | 'm7' | '7' | 'maj7' | 'dim' | 'sus4' | 'm' ...
  b?: number // optional bass (slash chord), pitch class 0–11
}

/** A lick row as stored in Supabase (`licks.licks`) and used across the app. */
export interface Lick {
  id: string
  slug: string
  name: string
  description: string | null
  category: Category
  genre: Genre
  difficulty: Difficulty
  original_key: number // 0–11, 0 = C
  default_bpm: number
  beats: number // total length in beats
  time_signature: string // e.g. '4/4'
  notes: LickNote[]
  chords: LickChord[]
  tags: string[]
  status: LickStatus
  submitted_by?: string | null
  created_at?: string
  /** Defaults to 'major' — optional so pre-existing rows/data (seed licks,
   * old DB rows before 0004_theory_metadata.sql) still type-check. */
  mode?: Mode
  /** Defaults to [] — see `mode`. */
  harmonic_function?: string[]
  /** Defaults to 'lick' — see `mode`. */
  kind?: Kind
  /** Defaults to 'piano' — optional som `mode` slik at pre-0005-rader og gammel
   * seed-data fortsatt type-sjekker. Gitar-licks bærer `s` på hver note. */
  instrument?: Instrument
}

/** The subset an author writes (DB fills id/status/created_at). */
export type SeedLick = Omit<Lick, 'id' | 'status' | 'submitted_by' | 'created_at'>

export type HandFilter = 'both' | 'L' | 'R'
