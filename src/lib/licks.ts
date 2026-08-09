import type { Lick, SeedLick } from '@/types/lick'
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

// Seed-korpuset er ~850 kB kildekode. Det trengs BARE når Supabase mangler
// eller svikter (kald sti), så det lastes dynamisk — da havner det i en egen
// chunk som en vanlig besøkende aldri henter. Promiset caches på modulnivå,
// slik at gjentatte kall verken re-importerer eller re-mapper korpuset.
let fallbackPromise: Promise<Lick[]> | null = null

/** Last (og memoiser) hele seed-korpuset som ferdige Lick-objekter. */
function loadFallbackLicks(): Promise<Lick[]> {
  fallbackPromise ??= (async () => {
    const [{ SEED_LICKS }, { SEED_GITAR_LICKS }, { SEED_BASS_LICKS }] = await Promise.all([
      import('@/data/seed-licks'),
      import('@/data/seed-licks-gitar'),
      import('@/data/seed-licks-bass'),
    ])
    return [...SEED_LICKS, ...SEED_GITAR_LICKS, ...SEED_BASS_LICKS].map(seedToLick)
  })()
  return fallbackPromise
}

/**
 * Load all published licks. Reads from Supabase (`licks.licks`) when configured,
 * otherwise (or on any error / empty table) returns the bundled seed data so the
 * app is always functional in dev and degrades gracefully in production.
 */
export async function fetchLicks(): Promise<Lick[]> {
  const supabase = createClient()
  if (!supabase) return loadFallbackLicks()
  try {
    const { data, error } = await supabase
      .from('licks')
      .select('*')
      .eq('status', 'published')
      .order('difficulty', { ascending: true })
      .order('name', { ascending: true })
    if (error || !data || data.length === 0) return loadFallbackLicks()
    return data as Lick[]
  } catch {
    return loadFallbackLicks()
  }
}

/** Load a single published lick by slug, with the same fallback behaviour. */
export async function fetchLick(slug: string): Promise<Lick | null> {
  const supabase = createClient()
  // NB: fallback hentes først når den faktisk trengs — ikke opp front som før.
  const fallback = async () => (await loadFallbackLicks()).find((l) => l.slug === slug) ?? null
  if (!supabase) return fallback()
  try {
    const { data, error } = await supabase
      .from('licks')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()
    if (error || !data) return fallback()
    return data as Lick
  } catch {
    return fallback()
  }
}
