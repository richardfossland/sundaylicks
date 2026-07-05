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

/** Timing-safe-ish check of the admin password against ADMIN_PASSWORD. */
export function checkAdminPassword(supplied: string | null): 'ok' | 'unset' | 'bad' {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return 'unset'
  if (!supplied) return 'bad'
  if (supplied.length !== expected.length) return 'bad'
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= supplied.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0 ? 'ok' : 'bad'
}
