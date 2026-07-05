'use client'

import dynamic from 'next/dynamic'

// AdminPanel previews licks via Tone.js → client-only.
const AdminPanel = dynamic(() => import('@/components/AdminPanel').then((m) => m.AdminPanel), {
  ssr: false,
  loading: () => <p className="py-24 text-center text-[var(--color-muted)]">Laster …</p>,
})

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <AdminPanel />
    </main>
  )
}
