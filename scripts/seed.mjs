// Seed / upsert the curated licks into `licks.licks`.
//
//   npm run seed        (loads .env.local; needs SUPABASE_SERVICE_ROLE_KEY)
//
// The service role bypasses RLS, so this is the ONLY writer to the table. Data
// comes from src/data/seed-licks.ts (the single source of truth) and is
// validated with the same zod schema the future submission flow will use.
// Requires Node ≥ 22 (built-in TypeScript type stripping to import the .ts).

import { createClient } from '@supabase/supabase-js'
import { SEED_LICKS } from '../src/data/seed-licks.ts'
import { seedLickSchema } from '../src/lib/validation.ts'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('✗ Mangler NEXT_PUBLIC_SUPABASE_URL og/eller SUPABASE_SERVICE_ROLE_KEY i .env.local')
  process.exit(1)
}

// Validate every lick before touching the DB.
const rows = []
for (const lick of SEED_LICKS) {
  const parsed = seedLickSchema.safeParse(lick)
  if (!parsed.success) {
    console.error(`✗ Ugyldig lick "${lick.slug}":`)
    for (const issue of parsed.error.issues) {
      console.error(`   ${issue.path.join('.')}: ${issue.message}`)
    }
    process.exit(1)
  }
  rows.push({ ...parsed.data, status: 'published' })
}

const supabase = createClient(url, serviceKey, {
  db: { schema: 'licks' },
  auth: { persistSession: false },
})

const { error } = await supabase.from('licks').upsert(rows, { onConflict: 'slug' })
if (error) {
  console.error('✗ Upsert feilet:', error.message)
  process.exit(1)
}

console.log(`✓ Seedet ${rows.length} licks til licks.licks`)
