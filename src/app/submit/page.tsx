'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

// Editor pulls in Tone.js (audio preview) → client-only.
const LickEditor = dynamic(() => import('@/components/LickEditor').then((m) => m.LickEditor), {
  ssr: false,
  loading: () => (
    <p className="py-24 text-center text-[var(--color-muted)]">Laster editor …</p>
  ),
})

export default function SubmitPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ivory)]">
        <ArrowLeft className="h-4 w-4" /> Biblioteket
      </Link>
      <header className="mb-6">
        <h1 className="font-display text-3xl text-[var(--color-ivory)] sm:text-4xl">Send inn en lick</h1>
        <p className="mt-2 max-w-2xl text-[var(--color-muted)]">
          Bygg din egen gospel-lick i rutenettet, forhåndsvis den, og send den inn. Etter godkjenning
          havner den i biblioteket for alle.
        </p>
      </header>
      <LickEditor />
    </main>
  )
}
