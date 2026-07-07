import { Wand2 } from 'lucide-react'
import { AppShell } from '@/components/AppShell'

// PLACEHOLDER — W4 replaces this file's content with the actual Spill
// smartere-modus (toneart-overganger + spice up; also where the KeySelector
// moves to, per W1's brief). See AppShell.tsx for the wrapping contract
// every mode route follows.
export default function SpillPage() {
  return (
    <AppShell mode="spill">
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-20 text-center sm:py-28">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--color-ember)]/12 text-[var(--color-ember)]">
          <Wand2 className="h-8 w-8" strokeWidth={1.75} />
        </span>
        <h1 className="font-display text-3xl text-[var(--color-ivory)] sm:text-4xl">Spill smartere kommer her</h1>
        <p className="max-w-md text-[var(--color-muted)]">
          Overganger mellom tonearter og krydder for progresjoner flytter inn i denne modusen.
        </p>
      </main>
    </AppShell>
  )
}
