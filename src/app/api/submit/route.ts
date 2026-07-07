import { NextResponse } from 'next/server'
import { submissionSchema } from '@/lib/validation'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Public endpoint: accept a user-contributed lick, validate it, and insert it
// with status='submitted' via the service role (RLS stays locked to anon reads).
// The row is invisible to the public until an admin approves it.
//
// Also doubles as the "curate to library" route for generated content
// (workstream D/E): the body may include `kind` (e.g. 'transition'), `mode`,
// and `harmonic_function` — submissionSchema defaults them to 'lick'/'major'/[]
// when omitted, so ordinary submissions are unaffected.

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

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
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

  const { error } = await supabase.from('licks').insert({
    ...parsed.data,
    slug: slugify(parsed.data.name),
    status: 'submitted',
    submitted_by: submittedBy,
  })
  if (error) {
    return NextResponse.json({ error: 'Kunne ikke lagre: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
