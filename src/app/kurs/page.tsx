import { GraduationCap } from 'lucide-react'
import { AppShell } from '@/components/AppShell'

// PLACEHOLDER — W3 replaces this file's content with the actual Kurs-modus
// (curated learning paths). See AppShell.tsx for the wrapping contract every
// mode route follows.
export default function KursPage() {
  return (
    <AppShell mode="kurs">
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-20 text-center sm:py-28">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--color-sea)]/12 text-[var(--color-sea)]">
          <GraduationCap className="h-8 w-8" strokeWidth={1.75} />
        </span>
        <h1 className="font-display text-3xl text-[var(--color-ivory)] sm:text-4xl">Kurs-modus kommer her</h1>
        <p className="max-w-md text-[var(--color-muted)]">De strukturerte kurs-løpene flytter inn i denne modusen.</p>
      </main>
    </AppShell>
  )
}
