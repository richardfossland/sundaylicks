import { Suspense } from 'react'
import { AppShell } from '@/components/AppShell'
import { OveView } from './OveView'

// Øv-modus (W2) — the focused library workspace: search + progressively
// disclosed filters, sort, and "Mine lister" (favorites + practice lists)
// as a top-level tab instead of always-open filter rows. See OveView.tsx
// for the implementation and AppShell.tsx for the wrapping contract every
// mode route follows.
//
// AppShell is mounted here (outside the Suspense boundary) so the topbar
// renders immediately; only OveView — which reads `useSearchParams` —
// needs to suspend.
export default function OvePage() {
  return (
    <AppShell mode="ove">
      <Suspense
        fallback={<main className="mx-auto max-w-7xl px-4 py-8 sm:py-12 text-[var(--color-muted)]">Laster …</main>}
      >
        <OveView />
      </Suspense>
    </AppShell>
  )
}
