import { NextResponse } from 'next/server'
import { submissionSchema } from '@/lib/validation'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkSubmitRate, exceedsBodyLimit, windowStartIso } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Public endpoint: accept a user-contributed lick, validate it, and insert it
// with status='submitted' via the service role (RLS stays locked to anon reads).
// The row is invisible to the public until an admin approves it.
//
// Also doubles as the "curate to library" route for generated content
// (workstream D/E): the body may include `kind` (e.g. 'transition'), `mode`,
// and `harmonic_function` — submissionSchema defaults them to 'lick'/'major'/[]
// when omitted, so ordinary submissions are unaffected.
//
// ── Struping (natt-runde F4) ────────────────────────────────────────────────
// Ruten er åpen, uinnlogget OG skriver med service-role. Supabase-prosjektet
// deles med hele SundaySuite på gratis-planen, så vi må ha et tak. Vi har ingen
// KV- eller Durable-Object-binding (se wrangler.jsonc), derfor telles kvoten i
// selve `licks`-tabellen: antall rader med status='submitted' siste døgn.
//   1. Kroppsvakt  — > 64 KB avvises FØR vi parser JSON eller kjører zod.
//   2. Globalt tak — maks 100 innsendinger per døgn for hele appen.
//   3. Per bruker  — maks 10 per `submitted_by` per døgn.
// Selve regnestykket ligger i src/lib/rate-limit.ts (rent + enhetstestet).
//
// ⚠️ Ingen per-IP-grense: det krever delt tilstand (KV/DO) som appen ikke har.
// `submitted_by` er dessuten klient-oppgitt (localStorage-id) og kan nullstilles,
// så per-bruker-taket stopper uhell og lettvint misbruk — det GLOBALE taket er
// det som faktisk verner databasen mot en bestemt angriper.

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[æå]/g, 'a')
    .replace(/ø/g, 'o')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  const suffix = crypto.randomUUID().slice(0, 6)
  return `${base || 'lick'}-${suffix}`
}

/** Postgres' unique_violation. Her: slug-kollisjon (slug er unique i 0001). */
const UNIQUE_VIOLATION = '23505'

export async function POST(req: Request) {
  // 1. Kroppsvakt — les som tekst først, så vi kan måle størrelsen før vi
  //    parser. Grensen ligger godt over den største skjemagyldige raden.
  let raw: string
  try {
    raw = await req.text()
  } catch {
    return NextResponse.json({ error: 'Kunne ikke lese forespørselen' }, { status: 400 })
  }
  if (exceedsBodyLimit(new TextEncoder().encode(raw).byteLength)) {
    return NextResponse.json(
      { error: 'Innsendingen er for stor (maks 64 kB).' },
      { status: 413 },
    )
  }

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 })
  }

  const submittedBy =
    body && typeof body === 'object' && typeof (body as { submitted_by?: unknown }).submitted_by === 'string'
      ? (body as { submitted_by: string }).submitted_by.slice(0, 80)
      : null

  const parsed = submissionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validering feilet', issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) },
      { status: 422 },
    )
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Innsending er ikke konfigurert enda (mangler service-role-nøkkel).' },
      { status: 503 },
    )
  }

  // 2. Tell kvoten i tabellen. `head: true` + `count: 'exact'` henter bare
  //    tallet, ingen rader. Innsendinger uten `submitted_by` deler én felles
  //    «anonym» bøtte (is null) — ellers ville det å utelate feltet omgå taket.
  const since = windowStartIso(Date.now())
  const base = () =>
    supabase.from('licks').select('id', { count: 'exact', head: true }).eq('status', 'submitted').gte('created_at', since)

  const userQuery = submittedBy ? base().eq('submitted_by', submittedBy) : base().is('submitted_by', null)
  const [globalRes, userRes] = await Promise.all([base(), userQuery])

  if (globalRes.error || userRes.error) {
    // Vi lukker heller døra enn å slippe gjennom en ukjent mengde skriv:
    // en tellefeil betyr at vi ikke VET om kvoten er brukt opp.
    console.error('[submit] kvotetelling feilet:', globalRes.error ?? userRes.error)
    return NextResponse.json(
      { error: 'Klarte ikke å sjekke innsendingskvoten akkurat nå. Prøv igjen om litt.' },
      { status: 503 },
    )
  }

  const verdict = checkSubmitRate({ user: userRes.count ?? 0, global: globalRes.count ?? 0 })
  if (!verdict.allowed) {
    return NextResponse.json(
      { error: verdict.message },
      { status: 429, headers: { 'Retry-After': String(verdict.retryAfterSeconds) } },
    )
  }

  // 3. Sett inn. Ved slug-kollisjon (unique) lager vi et nytt tilfeldig suffiks
  //    og prøver ÉN gang til — kollisjonen er tilfeldig, ikke en brukerfeil.
  const row = {
    ...parsed.data,
    status: 'submitted' as const,
    submitted_by: submittedBy,
  }

  let { error } = await supabase.from('licks').insert({ ...row, slug: slugify(parsed.data.name) })
  if (error?.code === UNIQUE_VIOLATION) {
    ;({ error } = await supabase.from('licks').insert({ ...row, slug: slugify(parsed.data.name) }))
  }

  if (error) {
    // Rå Postgres-feil kan lekke skjema-, kolonne- og policy-detaljer.
    // De hører hjemme i Worker-loggen, ikke i svaret til klienten.
    console.error('[submit] insert feilet:', error)
    return NextResponse.json({ error: 'Kunne ikke lagre innsendingen akkurat nå. Prøv igjen senere.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
