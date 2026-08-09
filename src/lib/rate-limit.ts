// Ren beslutningskjerne for strupingen av /api/submit.
//
// Bakgrunnen: /api/submit skriver med service-role-nøkkelen og er åpen for alle
// uten innlogging. Én skjemagyldig rad kan bli ~24 KB, og Supabase-prosjektet
// deles med HELE SundaySuite på gratis-planen — så en ubegrenset skrivevei er
// en reell fare for hele suiten, ikke bare for denne appen.
//
// Denne fila inneholder BARE regnestykket: tellinger inn → dom ut. Ingen
// nettverk, ingen klokke, ingen Supabase. Rutene gjør de virkelige spørringene
// (antall rader med status='submitted' siste døgn) og mater tallene hit, slik at
// grensene kan enhetstestes uten database.
//
// ⚠️ KJENT BEGRENSNING: vi kan ikke begrense per IP. Det ville krevd delt,
// rask tilstand (Cloudflare KV eller en Durable Object), og appen har ingen
// slike bindinger i wrangler.jsonc — å legge dem til er en egen infrastruktur-
// beslutning for eieren. `submitted_by` er dessuten bare en localStorage-id
// klienten sender selv, så den kan nullstilles av en angriper. Per-bruker-taket
// stopper derfor uhell og lettvint misbruk; DØGNTAKET GLOBALT er det som faktisk
// verner databasen mot en bestemt angriper.

/** Grensene som gjelder for /api/submit. */
export const SUBMIT_LIMITS = {
  /** Maks rader med status='submitted' per `submitted_by` siste 24 t. */
  perUser: 10,
  /** Maks rader med status='submitted' totalt siste 24 t. */
  global: 100,
  /** Maks råstørrelse på forespørselskroppen, i bytes (64 KB). */
  maxBodyBytes: 64 * 1024,
  /** Vinduet tellingene gjelder for, i millisekunder. */
  windowMs: 24 * 60 * 60 * 1000,
} as const

export type SubmitLimits = {
  perUser: number
  global: number
  maxBodyBytes: number
  windowMs: number
}

export type RateLimitVerdict =
  | { allowed: true }
  | { allowed: false; reason: 'per-user' | 'global'; message: string; retryAfterSeconds: number }

/**
 * Avgjør om en ny innsending slipper gjennom.
 *
 * @param counts.user   antall innsendinger fra samme `submitted_by` i vinduet
 * @param counts.global antall innsendinger totalt i vinduet
 *
 * Det globale taket sjekkes FØRST: når kvoten for hele appen er brukt opp skal
 * alle få samme svar, uansett hvor mye den enkelte har sendt inn.
 */
export function checkSubmitRate(
  counts: { user: number; global: number },
  limits: SubmitLimits = SUBMIT_LIMITS,
): RateLimitVerdict {
  const retryAfterSeconds = Math.ceil(limits.windowMs / 1000)

  if (counts.global >= limits.global) {
    return {
      allowed: false,
      reason: 'global',
      message:
        'Vi tar imot et begrenset antall innsendinger per døgn, og kvoten er brukt opp. Prøv igjen i morgen.',
      retryAfterSeconds,
    }
  }

  if (counts.user >= limits.perUser) {
    return {
      allowed: false,
      reason: 'per-user',
      message: `Du har sendt inn ${limits.perUser} licks det siste døgnet — det er taket. Prøv igjen senere.`,
      retryAfterSeconds,
    }
  }

  return { allowed: true }
}

/** Er kroppen for stor? Sjekkes FØR zod, så vi aldri parser en enorm streng. */
export function exceedsBodyLimit(byteLength: number, limits: SubmitLimits = SUBMIT_LIMITS): boolean {
  return byteLength > limits.maxBodyBytes
}

/** ISO-tidspunktet vinduet starter på, gitt «nå». Brukes i created_at-filteret. */
export function windowStartIso(now: number, limits: SubmitLimits = SUBMIT_LIMITS): string {
  return new Date(now - limits.windowMs).toISOString()
}
