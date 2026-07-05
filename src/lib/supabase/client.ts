import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser Supabase client (anon key), scoped to the dedicated `licks` schema so
 * SundayLicks coexists with the other SundaySuite apps in the same shared
 * Supabase project without table clashes. Every `.from('licks')` therefore
 * resolves to `licks.licks`.
 *
 * SundayLicks is read-only in v1: the public `read published` RLS policy is the
 * only access the anon key needs. Returns null when env is not configured, so
 * callers can fall back to the bundled seed data.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createBrowserClient(url, key, {
    db: { schema: 'licks' },
  })
}
