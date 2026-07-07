'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Compass, Waypoints, ListMusic, BarChart3, Plus } from 'lucide-react'
import { KeySelector } from './KeySelector'
import { cn } from '@/lib/cn'

const NAV_ITEMS = [
  { href: '/', label: 'Dashbord', icon: LayoutDashboard },
  { href: '/utforsk', label: 'Utforsk', icon: Compass },
  { href: '/transitions', label: 'Overganger', icon: Waypoints },
  { href: '/utforsk?mode=favs', label: 'Mine lister', icon: ListMusic, match: '/utforsk?mode=favs' },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
] as const

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-scene)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-scene)]/80">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link
          href="/"
          className="order-1 flex shrink-0 items-center gap-2 font-display text-lg text-[var(--color-ivory)] sm:text-xl"
        >
          <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--color-amber)]" />
          SundayLicks
        </Link>

        <div className="order-2 flex shrink-0 items-center gap-2">
          <KeySelector compact />
          <Link
            href="/submit"
            aria-label="Send inn en lick"
            title="Send inn en lick"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] transition-colors hover:border-[var(--color-amber)]/60 hover:text-[var(--color-ivory)]"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </div>

        <nav
          aria-label="Hovednavigasjon"
          className="scroll-x order-3 flex w-full items-center gap-1 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => {
            // "/utforsk" and "/utforsk?mode=favs" share a pathname — only treat
            // the plain library link as active for it, so the two don't both light up.
            const isMineLister = item.label === 'Mine lister'
            const active = isMineLister ? false : pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-[var(--color-amber)] bg-[var(--color-amber)] text-[var(--color-ink-on-amber)]'
                    : 'border-[var(--color-border)] bg-[var(--color-raised)] text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
