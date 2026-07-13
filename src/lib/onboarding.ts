// Onboarding-porten: hvem skal se den interaktive introduksjonen, og hvem har
// «egentlig» allerede vært innom appen? Ren kjerne + window-guardet flagg —
// samme mønster som prefs.ts (avhengighetsfri, testbar), så både forsiden
// (page.tsx-porten) og /innstillinger (åpne-direkte) kan importere den.
//
// Bevisst regel: EKSISTERENDE brukere får ALDRI onboarding tvunget på seg.
// Enten har de sett det gamle intro-banneret (`sundaylicks_seen_intro`) eller
// de har allerede øvd på minst én lick — i begge tilfeller settes det nye
// `sundaylicks_onboarded`-flagget stille, uten å vise overlayet. Bare en helt
// fersk profil (verken flagg, gammelt banner eller øvingslogg) møter introen.

const ONBOARDED_KEY = 'sundaylicks_onboarded'

export interface OnboardingGateInput {
  /** Har det nye onboarded-flagget allerede? Da er alt avgjort. */
  onboarded: boolean
  /** Så det gamle intro-banneret (legacy `sundaylicks_seen_intro`)? */
  seenOldIntro: boolean
  /** Antall øvde licks (getProgress().practiced.length). */
  practicedCount: number
}

export interface OnboardingGateResult {
  /** Vis onboarding-overlayet nå. */
  show: boolean
  /** Sett onboarded-flagget stille (uten å vise) — brukeren er «migrert». */
  migrateSilently: boolean
}

/**
 * Ren port: avgjør om onboarding skal vises, migreres stille, eller ignoreres.
 *   • allerede onboarded  → verken vis eller migrer.
 *   • gammelt intro-flagg ELLER practiced > 0 → migrer stille (aldri vis).
 *   • ellers (fersk profil) → vis.
 */
export function shouldShowOnboarding({
  onboarded,
  seenOldIntro,
  practicedCount,
}: OnboardingGateInput): OnboardingGateResult {
  if (onboarded) return { show: false, migrateSilently: false }
  if (seenOldIntro || practicedCount > 0) return { show: false, migrateSilently: true }
  return { show: true, migrateSilently: false }
}

/** Har brukeren fullført eller hoppet over onboarding? (false uten window.) */
export function isOnboarded(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(ONBOARDED_KEY) === '1'
  } catch {
    return false
  }
}

/** Marker onboarding som ferdig (fullført eller hoppet). No-op uten window. */
export function setOnboarded(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ONBOARDED_KEY, '1')
  } catch {
    /* storage blocked — ignore */
  }
}
