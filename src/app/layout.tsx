import type { Metadata, Viewport } from 'next'
import { Fraunces, Instrument_Sans } from 'next/font/google'
import { SiteHeader } from '@/components/SiteHeader'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no" className={`${instrument.variable} ${fraunces.variable}`}>
      <body className="min-h-screen bg-[var(--color-scene)] font-sans text-[var(--color-ivory)] antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  )
}
