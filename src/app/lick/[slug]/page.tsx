'use client'

import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { AppShell } from '@/components/AppShell'

// Load the practice view client-side only: Tone.js touches the AudioContext and
// must never run during SSR / the Cloudflare Worker render.
const Practice = dynamic(() => import('@/components/Practice').then((m) => m.Practice), {
  ssr: false,
  loading: () => (
    <main className="mx-auto max-w-md px-4 py-24 text-center text-[var(--color-muted)]">Laster …</main>
  ),
})

// Mode-agnostic: a lick can be reached from any of the 3 modes (library,
// course, or a generated preview), so AppShell renders here with no `mode` —
// bare brand chrome, no mode highlighted. See AppShell's contract comment.
export default function LickPage() {
  const params = useParams<{ slug: string }>()
  return (
    <AppShell>
      <Practice slug={params.slug} />
    </AppShell>
  )
}
