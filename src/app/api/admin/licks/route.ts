import { NextResponse } from 'next/server'
import { createAdminClient, checkAdminPassword, FAILED_AUTH_DELAY_MS } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Password-gated admin API (service role). GET lists submitted licks; POST
// approves (→ published) or rejects (→ deleted). Password comes in the
// `x-admin-key` header and is compared to the ADMIN_PASSWORD Worker secret.
//
// Vakten er tregere med vilje: passordsjekken er konstant-tids (se
// lib/supabase/admin.ts) OG hvert mislykket forsøk holdes igjen ~300 ms før
// 401-en sendes. Uten en KV/DO-binding kan vi ikke telle forsøk per IP, så
// forsinkelsen er det vi har mot rå gjetting — den senker takten kraftig og
// koster en ekte admin ingenting (én ventetid ved feiltasting).

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function gate(req: Request): Promise<NextResponse | null> {
  const state = await checkAdminPassword(req.headers.get('x-admin-key'))
  if (state === 'unset')
    return NextResponse.json({ error: 'Admin er ikke konfigurert (mangler ADMIN_PASSWORD).' }, { status: 503 })
  if (state === 'bad') {
    await sleep(FAILED_AUTH_DELAY_MS)
    return NextResponse.json({ error: 'Feil passord' }, { status: 401 })
  }
  return null
}

export async function GET(req: Request) {
  const blocked = await gate(req)
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
  const blocked = await gate(req)
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

  // ⚠️ Både update og delete filtrerer på `status='submitted'`, og PostgREST
  // svarer glad OK når INGEN rad traff. Uten `.select()` fikk admin «godkjent»
  // også for en id som ikke finnes, eller som en annen moderator alt hadde
  // behandlet — så panelet meldte suksess for noe som aldri skjedde.
  // `.select()` gir oss radene som faktisk ble endret; tom liste ⇒ 404.
  if (action === 'approve') {
    const { data, error } = await supabase
      .from('licks')
      .update({ status: 'published' })
      .eq('id', id)
      .eq('status', 'submitted')
      .select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0)
      return NextResponse.json(
        { error: 'Fant ingen innsending med denne id-en (kanskje alt behandlet?).' },
        { status: 404 },
      )
  } else {
    const { data, error } = await supabase
      .from('licks')
      .delete()
      .eq('id', id)
      .eq('status', 'submitted')
      .select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0)
      return NextResponse.json(
        { error: 'Fant ingen innsending med denne id-en (kanskje alt behandlet?).' },
        { status: 404 },
      )
  }
  return NextResponse.json({ ok: true })
}
