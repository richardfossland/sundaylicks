import { Dumbbell, GraduationCap, Wand2, type LucideIcon } from 'lucide-react'

// The 3 modes SundayLicks is organised around. One source of truth, imported
// by the launcher (ModeCard grid), AppShell (topbar mode name + switcher),
// and every mode's own route tree (W2 = ove, W3 = kurs, W4 = spill).
//
// `id`/`slug` are the same string today (route segment doubles as identity)
// but are kept as separate fields so a future mode can have a URL slug that
// differs from its internal id without a breaking rename.

export type ModeId = 'ove' | 'kurs' | 'spill'

/** The 3 accent colours a mode can carry — see globals.css for the tokens. */
export type Accent = 'amber' | 'sea' | 'ember'

export interface ModeDef {
  id: ModeId
  /** Route segment: the mode lives at `/${slug}`. */
  slug: string
  /** Verb-first call to action, e.g. "Øv på licks". Used as the launcher
   * card title AND as the "current mode" label in AppShell's topbar. */
  label: string
  /** Short noun form for tight spaces (compact switcher tooltips, breadcrumbs). */
  shortLabel: string
  /** One explanatory line — what this mode is for. */
  tagline: string
  accent: Accent
  icon: LucideIcon
}

export const MODES: ModeDef[] = [
  {
    // NB: `slug` er 'bla' (ikke 'ove') — Øv-modus åpner nå reel-blaingen (/bla)
    // som browse-standard; ModeCard + ModeSwitcher bygger href fra slug, så
    // launcher-kortet og modus-bytteren peker dit automatisk. Bibliotek-
    // arbeidsflaten lever fortsatt på /ove (nåbar via «Bla ↔ Bibliotek»-toggle);
    // `id` forblir 'ove' så AppShell mode="ove" fortsatt matcher begge rutene.
    id: 'ove',
    slug: 'bla',
    label: 'Øv på licks',
    shortLabel: 'Øv',
    tagline: 'Bla gjennom biblioteket som en feed — eller søk, filtrer og øv deg gjennom det.',
    accent: 'amber',
    icon: Dumbbell,
  },
  {
    id: 'kurs',
    slug: 'kurs',
    label: 'Ta et kurs',
    shortLabel: 'Kurs',
    tagline: 'Strukturerte løp gjennom biblioteket — fra nybegynner til avansert.',
    accent: 'sea',
    icon: GraduationCap,
  },
  {
    id: 'spill',
    slug: 'spill',
    label: 'Spill smartere',
    shortLabel: 'Smartere',
    tagline: 'Naturlige overganger mellom tonearter, og måter å krydre en progresjon på.',
    accent: 'ember',
    icon: Wand2,
  },
]

export function getMode(id: ModeId | string | undefined | null): ModeDef | undefined {
  return MODES.find((m) => m.id === id)
}

export function getModeByPath(pathname: string): ModeDef | undefined {
  return MODES.find((m) => pathname === `/${m.slug}` || pathname.startsWith(`/${m.slug}/`))
}

/**
 * Literal Tailwind class strings per accent. Kept as whole strings (never
 * built via template interpolation) so Tailwind's static scanner can see and
 * generate them — a dynamic `` `bg-[var(--color-${accent})]` `` would not.
 */
export const ACCENT_CLASSES: Record<
  Accent,
  { text: string; bg: string; ink: string; softBg: string; softText: string; border: string; hoverBorder: string }
> = {
  amber: {
    text: 'text-[var(--color-amber)]',
    bg: 'bg-[var(--color-amber)]',
    ink: 'text-[var(--color-ink-on-amber)]',
    softBg: 'bg-[var(--color-amber)]/12',
    softText: 'text-[var(--color-amber)]',
    border: 'border-[var(--color-amber)]',
    hoverBorder: 'hover:border-[var(--color-amber)]/60',
  },
  sea: {
    text: 'text-[var(--color-sea)]',
    bg: 'bg-[var(--color-sea)]',
    ink: 'text-[var(--color-ink-on-sea)]',
    softBg: 'bg-[var(--color-sea)]/12',
    softText: 'text-[var(--color-sea)]',
    border: 'border-[var(--color-sea)]',
    hoverBorder: 'hover:border-[var(--color-sea)]/60',
  },
  ember: {
    text: 'text-[var(--color-ember)]',
    bg: 'bg-[var(--color-ember)]',
    ink: 'text-[var(--color-ink-on-ember)]',
    softBg: 'bg-[var(--color-ember)]/12',
    softText: 'text-[var(--color-ember)]',
    border: 'border-[var(--color-ember)]',
    hoverBorder: 'hover:border-[var(--color-ember)]/60',
  },
}
