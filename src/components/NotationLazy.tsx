'use client'

import dynamic from 'next/dynamic'

// VexFlow (~968 KB decoded / ~308 KB brotli) is by far the heaviest dependency
// in the app, and it is ONLY needed to render sheet music. The default piano-roll
// view never touches it, and the /spill result cards merely preview notation — yet
// a static `import { Notation }` pulled all of VexFlow into every eager route bundle
// that renders a card (notably /spill, whose initial payload was ~2 MB of JS).
//
// Loading Notation dynamically (ssr:false — VexFlow needs the DOM anyway) keeps
// VexFlow out of the initial bundle; it now arrives on demand the first time a
// staff actually renders. The fixed-height placeholder matches Notation's rendered
// box (230px SVG + p-2 padding + border ≈ 248px) so the swap-in causes no layout
// shift (CLS). Import this wherever the old `@/components/Notation` was used.
export const Notation = dynamic(() => import('./Notation').then((m) => m.Notation), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
      style={{ height: 248 }}
      aria-hidden
    />
  ),
})
