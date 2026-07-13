import { Suspense } from 'react'
import { AppShell } from '@/components/AppShell'
import { SpillView } from './SpillView'

// "Spill smartere"-modus (W4). Merges the old /spice (krydre en progresjon)
// and /transitions (overganger mellom tonearter) flows into one mode, tabbed
// via `?fane=krydre|overganger`. This is the ONLY place in the app that owns
// a <KeySelector> — see AppShell.tsx's contract comment. `/spice` and
// `/transitions` now just redirect here (kept alive for old bookmarks / the
// website toolbox links).
//
// `SpillView` reads `useSearchParams()` (to seed the active fane from the
// URL), which requires a Suspense boundary in the App Router — same pattern
// as /utforsk's ExploreView.
export default function SpillPage() {
  return (
    <AppShell mode="spill">
      <Suspense
        fallback={
          <main className="mx-auto max-w-7xl px-4 py-8 text-[var(--color-muted)] sm:py-12">Laster …</main>
        }
      >
        <SpillView />
      </Suspense>
    </AppShell>
  )
}
