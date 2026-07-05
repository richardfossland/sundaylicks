import Link from 'next/link'
import { GraduationCap, Play } from 'lucide-react'
import type { CuratedPath } from '@/data/curated-paths'

export function PathCard({ path, practiced }: { path: CuratedPath; practiced: string[] }) {
  const done = path.slugs.filter((s) => practiced.includes(s)).length
  const pct = path.slugs.length ? Math.round((done / path.slugs.length) * 100) : 0

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-start gap-2">
        <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-amber)]" />
        <h3 className="font-display text-lg leading-tight text-[var(--color-ivory)]">{path.name}</h3>
      </div>
      <p className="text-sm leading-relaxed text-[var(--color-muted)]">{path.description}</p>

      <div className="mt-auto">
        <div className="mb-1 flex items-center justify-between text-xs text-[var(--color-muted)]">
          <span>{path.slugs.length} licks</span>
          <span>
            {done}/{path.slugs.length} øvd
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-raised)]">
          <div className="h-full rounded-full bg-[var(--color-sea)]" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <Link
        href={`/lick/${path.slugs[0]}?path=${path.id}&i=0`}
        className="flex items-center justify-center gap-1.5 rounded-full bg-[var(--color-amber)] px-4 py-2 text-sm font-medium text-[#171210]"
      >
        <Play className="h-4 w-4" fill="currentColor" /> Start kurset
      </Link>
    </div>
  )
}
