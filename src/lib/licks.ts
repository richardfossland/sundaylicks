import type { Lick, SeedLick } from '@/types/lick'
import { SEED_LICKS } from '@/data/seed-licks'
import { SEED_GITAR_LICKS } from '@/data/seed-licks-gitar'
import { createClient } from './supabase/client'

// Turn an authored SeedLick into a full Lick for offline/fallback use. The DB
// supplies id/status/created_at in production; here we synthesise stable stand-ins.
function seedToLick(seed: SeedLick): Lick {
  return {
    ...seed,
    id: `seed:${seed.slug}`,
    status: 'published',
    submitted_by: null,
  }
}

export const FALLBACK_LICKS: Lick[] = [...SEED_LICKS, ...SEED_GITAR_LICKS].map(seedToLick)

/**
 * Load all published licks. Reads from Supabase (`licks.licks`) when configured,
 * otherwise (or on any error / empty table) returns the bundled seed data so the
 * app is always functional in dev and degrades gracefully in production.
 */
export async function fetchLicks(): Promise<Lick[]> {
  const supabase = createClient()
  if (!supabase) return FALLBACK_LICKS
  try {
    const { data, error } = await supabase
      .from('licks')
      .select('*')
      .eq('status', 'published')
      .order('difficulty', { ascending: true })
      .order('name', { ascending: true })
    if (error || !data || data.length === 0) return FALLBACK_LICKS
    return data as Lick[]
  } catch {
    return FALLBACK_LICKS
  }
}

/** Load a single published lick by slug, with the same fallback behaviour. */
export async function fetchLick(slug: string): Promise<Lick | null> {
  const supabase = createClient()
  const fallback = FALLBACK_LICKS.find((l) => l.slug === slug) ?? null
  if (!supabase) return fallback
  try {
    const { data, error } = await supabase
      .from('licks')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()
    if (error || !data) return fallback
    return data as Lick
  } catch {
    return fallback
  }
}
