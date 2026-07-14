'use client'

import dynamic from 'next/dynamic'

// Som NotationLazy: VexFlow er appens tyngste avhengighet og trengs bare når en
// TAB faktisk rendres. Dynamisk import (ssr:false — VexFlow trenger DOM) holder
// den ute av den innledende bundelen. Plassholderen matcher Tabs rendrede boks
// (160px SVG + p-2 + border ≈ 178px) så innbyttet ikke gir layout-hopp (CLS).
export const Tab = dynamic(() => import('./Tab').then((m) => m.Tab), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
      style={{ height: 178 }}
      aria-hidden
    />
  ),
})
