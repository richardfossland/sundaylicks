// Backfill `mode` + `harmonic_function` on the seed licks (0004_theory_metadata.sql
// adds the columns with defaults, so this is best-effort enrichment, not a
// correctness requirement — every row is already valid with the defaults).
//
//   node --env-file=.env.local scripts/backfill-metadata.mjs
//
// TODO(workstream A): once src/lib/theory/analyze.ts lands (chord/scale-degree
// analysis over a lick's notes+chords), wire it in below to derive real
// `mode`/`harmonic_function` values instead of the stub defaults. Until then
// this script is a no-op placeholder so `kind`/`mode`/`harmonic_function`
// exist end-to-end (schema → validation → seed) without blocking on A.

import { createClient } from '@supabase/supabase-js'
import { SEED_LICKS } from '../src/data/seed-licks.ts'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('✗ Mangler NEXT_PUBLIC_SUPABASE_URL og/eller SUPABASE_SERVICE_ROLE_KEY i .env.local')
  process.exit(1)
}

let analyze = null
try {
  // Dynamic + optional: only present once workstream A lands `theory/analyze.ts`.
  ;({ analyzeLick: analyze } = await import('../src/lib/theory/analyze.ts'))
} catch {
  console.log('ℹ analyze.ts finnes ikke enda (workstream A) — bruker stub-default (major / []).')
}

function metadataFor(lick) {
  if (analyze) {
    try {
      const r = analyze(lick)
      return { mode: r.mode ?? 'major', harmonic_function: r.harmonic_function ?? [] }
    } catch (e) {
      console.warn(`  ⚠ analyze() feilet for "${lick.slug}": ${e instanceof Error ? e.message : e}`)
    }
  }
  return { mode: 'major', harmonic_function: [] }
}

const supabase = createClient(url, serviceKey, {
  db: { schema: 'licks' },
  auth: { persistSession: false },
})

let updated = 0
for (const lick of SEED_LICKS) {
  const { mode, harmonic_function } = metadataFor(lick)
  const { error } = await supabase.from('licks').update({ mode, harmonic_function }).eq('slug', lick.slug)
  if (error) {
    console.error(`✗ Kunne ikke oppdatere "${lick.slug}": ${error.message}`)
    process.exit(1)
  }
  updated++
}

console.log(`✓ Backfilt metadata (mode/harmonic_function) for ${updated} licks${analyze ? '' : ' (stub-verdier)'}`)
