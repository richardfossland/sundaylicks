'use client'

import { Heart } from 'lucide-react'
import { useCollections } from '@/lib/collections'
import { cn } from '@/lib/cn'

interface Props {
  slug: string
  /** Stop the click bubbling to a wrapping <Link> (card use). */
  stopNav?: boolean
  size?: number
  className?: string
}

export function FavoriteButton({ slug, stopNav, size = 18, className }: Props) {
  const fav = useCollections((s) => s.favorites.includes(slug))
  const toggle = useCollections((s) => s.toggleFavorite)

  return (
    <button
      type="button"
      aria-pressed={fav}
      aria-label={fav ? 'Fjern favoritt' : 'Legg til favoritt'}
      onClick={(e) => {
        if (stopNav) {
          e.preventDefault()
          e.stopPropagation()
        }
        toggle(slug)
      }}
      className={cn(
        'grid place-items-center rounded-full p-1.5 transition-colors',
        fav ? 'text-[var(--color-amber)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
        className,
      )}
    >
      <Heart style={{ width: size, height: size }} fill={fav ? 'currentColor' : 'none'} />
    </button>
  )
}
