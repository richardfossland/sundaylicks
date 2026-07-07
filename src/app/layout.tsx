import type { Metadata, Viewport } from 'next'
import { Fraunces, Instrument_Sans } from 'next/font/google'
import './globals.css'

const instrument = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument' })
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' })

export const metadata: Metadata = {
  title: 'SundayLicks — øv gospel-licks på piano',
  description:
    'Interaktivt bibliotek av gospel- og lovsang-licks for piano. Opplyst klaviatur, live tempo og transponering til alle tonearter.',
}

export const viewport: Viewport = {
  themeColor: '#171210',
  width: 'device-width',
  initialScale: 1,
}

// The shell is mode-based now (see `AppShell`'s contract comment) rather
// than a single global header, so the root layout stays a bare scaffold —
// fonts, background, and the `<html>`/`<body>` tags — and each route mounts
// its own `<AppShell mode="...">` (or none, for mode-agnostic pages).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no" className={`${instrument.variable} ${fraunces.variable}`}>
      <body className="min-h-screen bg-[var(--color-scene)] font-sans text-[var(--color-ivory)] antialiased">
        {children}
      </body>
    </html>
  )
}
