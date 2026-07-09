import type { Metadata } from 'next'
import { AppShell } from '@/components/AppShell'
import { GlossaryBrowser } from './GlossaryBrowser'

export const metadata: Metadata = {
  title: 'Oppslagsverk — SundayLicks',
  description:
    'Musikkordliste for kirkemusikere: harmoni, rytme, sjangere, teknikk og notasjon — alle fagordene i appen forklart på norsk.',
}

export default function OppslagsverkPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <GlossaryBrowser />
      </main>
    </AppShell>
  )
}
