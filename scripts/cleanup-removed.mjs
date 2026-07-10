// Engangs-opprydding etter kurateringsrunden 2026-07-10: seed.mjs UPSERTER kun
// (onConflict: 'slug') og sletter aldri — licks som fjernes fra seed-lista blir
// derfor liggende som status='published' i `licks.licks` og ville fortsatt vist
// i prod. Dette scriptet sletter de kuraterte radene eksplisitt. Idempotent:
// kjøres den to ganger, er andre kjøring en no-op (0 rader).
//
// Kjøres av eier/agent med service-role fra .env.local:
//   npm run cleanup:removed
// Rekkefølge: merge kuraterings-PR → dette scriptet → `npm run seed` → deploy.

import { createClient } from '@supabase/supabase-js'

const REMOVED = [
  // ekte duplikater (innholdsverifisert transponering av annen lick)
  'fill-worship-e',
  'turnaround-1-6-2-5-bb',
  // nære duplikater
  'blues-turnaround-bb',
  'amen-ending-g',
  'neosoul-vamp-f',
  // tynne/uinteressante
  'intro-1-4-swell',
  'classical-scale-two-octave',
  'run-major-cascade',
  'worship-6-4-1-5-e',
  'run-pentatonic-c',
]

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Mangler NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (kjør med --env-file=.env.local)')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { db: { schema: 'licks' } })

const { data, error } = await supabase.from('licks').delete().in('slug', REMOVED).select('slug')
if (error) {
  console.error('Sletting feilet:', error.message)
  process.exit(1)
}
console.log(`✓ Slettet ${data.length} rader:`, data.map((r) => r.slug).join(', ') || '(ingen — allerede ryddet)')
