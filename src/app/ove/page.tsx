import { Dumbbell } from 'lucide-react'
import { AppShell } from '@/components/AppShell'

// PLACEHOLDER — W2 replaces this file's content with the actual Øv-modus
// (library browsing + practice view). The wrapping pattern below (AppShell
// + your own <main>) is the contract every mode route follows; see
// AppShell.tsx for the full write-up.
export default function OvePage() {
  return (
    <AppShell mode="ove">
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-20 text-center sm:py-28">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--color-amber)]/12 text-[var(--color-amber)]">
          <Dumbbell className="h-8 w-8" strokeWidth={1.75} />
        </span>
        <h1 className="font-display text-3xl text-[var(--color-ivory)] sm:text-4xl">Øv-modus kommer her</h1>
        <p className="max-w-md text-[var(--color-muted)]">
          Biblioteket og det opplyste klaviaturet flytter inn i denne modusen.
        </p>
      </main>
    </AppShell>
  )
}
