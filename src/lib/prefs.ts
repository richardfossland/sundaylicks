// Brukerpreferanser som er ekte *standarder* (ikke flyktig øktstate):
//   • PracticeDefaults {metronome, countIn} — hva øvingssiden starter FORHÅNDS-
//     armert med. Hydreres ÉN gang per app-økt inn i usePlayer (se store.ts's
//     hydratePracticeDefaults); TransportBar-togglene forblir flyktige og
//     overstyrer standarden for den enkelte økta uten å skrive tilbake hit.
//   • Reel-autospill — om /bla spiller av licken når du lander på et kort.
//
// Bevisst avhengighetsfri (ingen React/Tone/zustand) så både store.ts,
// BlaView og /innstillinger kan importere den. Alle skrivinger går gjennom
// window-guardede getters/setters; parse-kjernene er rene og testbare.

const PREFS_KEY = 'sundaylicks_prefs'
/** Egen, eksisterende nøkkel — beholdt for bakoverkompat (BlaView brukte den). */
const REEL_AUTOPLAY_KEY = 'sundaylicks_reel_autoplay'

export interface PracticeDefaults {
  /** Klikk på hvert slag under avspilling. */
  metronome: boolean
  /** Én takt med klikk før avspilling starter. */
  countIn: boolean
}

export const DEFAULT_PRACTICE_DEFAULTS: PracticeDefaults = { metronome: false, countIn: false }

/** Eksportert for test: parse/valider en rå prefs-blob → gyldig PracticeDefaults. */
export function parsePracticeDefaults(raw: string | null): PracticeDefaults {
  if (!raw) return { ...DEFAULT_PRACTICE_DEFAULTS }
  try {
    const p = JSON.parse(raw) as Partial<PracticeDefaults>
    return {
      metronome: typeof p.metronome === 'boolean' ? p.metronome : DEFAULT_PRACTICE_DEFAULTS.metronome,
      countIn: typeof p.countIn === 'boolean' ? p.countIn : DEFAULT_PRACTICE_DEFAULTS.countIn,
    }
  } catch {
    return { ...DEFAULT_PRACTICE_DEFAULTS }
  }
}

export function getPracticeDefaults(): PracticeDefaults {
  if (typeof window === 'undefined') return { ...DEFAULT_PRACTICE_DEFAULTS }
  try {
    return parsePracticeDefaults(localStorage.getItem(PREFS_KEY))
  } catch {
    return { ...DEFAULT_PRACTICE_DEFAULTS }
  }
}

/** Skriver HELE objektet (patch flettes over gjeldende lagret verdi). */
export function setPracticeDefaults(patch: Partial<PracticeDefaults>): PracticeDefaults {
  const next = { ...getPracticeDefaults(), ...patch }
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next))
  } catch {
    /* storage blocked — ignore */
  }
  return next
}

/** Reel-autospill er PÅ som standard (samme semantikk BlaView hadde før). */
export function getReelAutoplay(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const raw = localStorage.getItem(REEL_AUTOPLAY_KEY)
    return raw === null ? true : raw === '1'
  } catch {
    return true
  }
}

export function setReelAutoplay(on: boolean): void {
  try {
    localStorage.setItem(REEL_AUTOPLAY_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}
