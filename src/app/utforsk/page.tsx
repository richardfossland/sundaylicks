import { Suspense } from 'react'
import { ExploreView } from './ExploreView'

export default function UtforskPage() {
  return (
    <Suspense
      fallback={<main className="mx-auto max-w-5xl px-4 py-8 sm:py-12 text-[var(--color-muted)]">Laster …</main>}
    >
      <ExploreView />
    </Suspense>
  )
}
