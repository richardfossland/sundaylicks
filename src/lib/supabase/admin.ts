import { createClient } from '@supabase/supabase-js'

// NOTE: server-only module. Import ONLY from route handlers under src/app/api —
// never from a client component, or the service-role key would leak into the
// browser bundle.

// SERVER-ONLY service-role client, scoped to the `licks` schema. Bypasses RLS —
// used for the write paths (submission insert + admin approve/reject) so the
// table stays locked to anon (read-published only). The key is a Worker secret
// (SUPABASE_SERVICE_ROLE_KEY), never shipped to the browser.
//
// OpenNext maps Cloudflare Worker vars/secrets onto process.env at runtime, and
// `next dev` reads them from .env.local — so process.env is the one source here.

export function adminConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    db: { schema: 'licks' },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Hvor lenge et mislykket admin-forsøk holdes igjen før svaret sendes.
 * Gjør gjettemaskiner tregere (og gjør samtidig responstiden mindre
 * informativ). Rutene venter så lenge FØR de svarer 401.
 */
export const FAILED_AUTH_DELAY_MS = 300

const encoder = new TextEncoder()

/** SHA-256 av en streng — alltid 32 bytes, uansett hvor lang inndata er. */
async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))
}

/**
 * Konstant-tids sjekk av admin-passordet mot ADMIN_PASSWORD.
 *
 * ⚠️ Den gamle utgaven kortsluttet på `supplied.length !== expected.length` og
 * på tom verdi. Da lekket svartiden hvor langt det riktige passordet er, og en
 * angriper kunne finne lengden før hen begynte å gjette tegn. Nå sammenlignes
 * SHA-256-summene i stedet: de er alltid 32 bytes, så løkka gjør nøyaktig like
 * mye arbeid uansett hva som sendes inn — verken lengde eller hvor tidlig
 * første avvik kommer er synlig utenfra.
 *
 * (Digest, ikke HMAC: hensikten er en fastbreddes sammenligning, ikke å skjule
 * passordet — begge sider er allerede kjent for serveren.)
 */
export async function checkAdminPassword(supplied: string | null): Promise<'ok' | 'unset' | 'bad'> {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return 'unset'
  const [a, b] = await Promise.all([digest(supplied ?? ''), digest(expected)])
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0 ? 'ok' : 'bad'
}
