'use client'

import { ChevronDown } from 'lucide-react'

/**
 * Select — the app's single restyled native `<select>` (G4).
 *
 * We deliberately keep a native `<select>` rather than building a custom
 * listbox: it gets the platform picker for free (the iOS wheel especially),
 * full keyboard + screen-reader support, and zero a11y risk. The only styling
 * we override is the chrome — `appearance-none` strips the OS look and we layer
 * our own rounded-full raised pill plus a chevron on top. Every mode's filter
 * dropdown should route through here so they read as one control.
 */
export function Select({
  value,
  onChange,
  ariaLabel,
  className,
  children,
}: {
  value: string
  onChange: (v: string) => void
  ariaLabel?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <span className="relative inline-flex">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={`appearance-none rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] py-2 pl-3.5 pr-9 text-sm text-[var(--color-ivory)] outline-none focus:border-[var(--color-amber)] ${className ?? ''}`}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]"
      />
    </span>
  )
}
