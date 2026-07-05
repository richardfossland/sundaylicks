import { NextResponse } from 'next/server'
import { createAdminClient, checkAdminPassword } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Password-gated admin API (service role). GET lists submitted licks; POST
// approves (→ published) or rejects (→ deleted). Password comes in the
// `x-admin-key` header and is compared to the ADMIN_PASSWORD Worker secret.

function gate(req: Request): NextResponse | null {
  const state = checkAdminPassword(req.headers.get('x-admin-key'))
  if (state === 'unset')
    return NextResponse.json({ error: 'Admin er ikke konfigurert (mangler ADMIN_PASSWORD).' }, { status: 503 })
  if (state === 'bad') return NextResponse.json({ error: 'Feil passord' }, { status: 401 })
  return null
}

export async function GET(req: Request) {
  const blocked = gate(req)
  if (blocked) return blocked

  const supabase = createAdminClient()
  if (!supabase)
    return NextResponse.json({ error: 'Supabase er ikke konfigurert.' }, { status: 503 })

  const { data, error } = await supabase
    .from('licks')
    .select('*')
    .eq('status', 'submitted')
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ licks: data ?? [] })
}

export async function POST(req: Request) {
  const blocked = gate(req)
  if (blocked) return blocked

  let body: { id?: string; action?: string }
  try {
    body = (await req.json()) as { id?: string; action?: string }
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 })
  }
  const { id, action } = body
  if (!id || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: 'Mangler id eller ugyldig action' }, { status: 400 })
  }

  const supabase = createAdminClient()
  if (!supabase)
    return NextResponse.json({ error: 'Supabase er ikke konfigurert.' }, { status: 503 })

  if (action === 'approve') {
    const { error } = await supabase
      .from('licks')
      .update({ status: 'published' })
      .eq('id', id)
      .eq('status', 'submitted')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('licks').delete().eq('id', id).eq('status', 'submitted')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
