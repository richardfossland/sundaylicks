'use client'

import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'

// Load the practice view client-side only: Tone.js touches the AudioContext and
// must never run during SSR / the Cloudflare Worker render.
const Practice = dynamic(() => import('@/components/Practice').then((m) => m.Practice), {
  ssr: false,
  loading: () => (
    <main className="mx-auto max-w-md px-4 py-24 text-center text-[var(--color-muted)]">Laster …</main>
  ),
})

export default function LickPage() {
  const params = useParams<{ slug: string }>()
  return <Practice slug={params.slug} />
}
