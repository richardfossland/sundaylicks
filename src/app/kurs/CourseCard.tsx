import Link from 'next/link'
import { Check, GraduationCap, Play } from 'lucide-react'
import { GlossaryText } from '@/components/glossary/GlossaryText'
import { cn } from '@/lib/cn'
import type { CourseProgress } from './course-progress'
import { resumeStep } from './course-progress'

const CTA_LABEL: Record<CourseProgress['status'], string> = {
  'not-started': 'Start kurset',
  'in-progress': 'Fortsett kurset',
  done: 'Øv igjen',
}

/**
 * One course in the /kurs overview grid — sea-accented (Kurs-modus' colour),
 * calm rather than loud. Two separate links rather than one big card-link:
 * the title opens the numbered course detail, the button jumps straight
 * into practice at wherever the learner left off.
 */
export function CourseCard({ progress }: { progress: CourseProgress }) {
  const { path, doneCount, totalCount, pct, status } = progress
  const { slug, index } = resumeStep(progress)

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-sea)]/40">
      <Link href={`/kurs/${path.id}`} className="group flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl',
            status === 'done' ? 'bg-[var(--color-sea)] text-[var(--color-ink-on-sea)]' : 'bg-[var(--color-sea)]/12 text-[var(--color-sea)]',
          )}
        >
          {status === 'done' ? <Check className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
        </span>
        <h3 className="font-display text-lg leading-tight text-[var(--color-ivory)] transition-colors group-hover:text-[var(--color-sea)]">
          {path.name}
        </h3>
      </Link>

      <GlossaryText
        text={path.description}
        className="text-sm leading-relaxed text-[var(--color-muted)]"
      />

      <div className="mt-auto">
        <div className="mb-1 flex items-center justify-between text-xs text-[var(--color-muted)]">
          <span>{totalCount} licks</span>
          <span>
            {doneCount}/{totalCount} øvd
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-raised)]">
          <div className="h-full rounded-full bg-[var(--color-sea)] transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/lick/${slug}?path=${path.id}&i=${index}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--color-sea)] px-4 py-2 text-sm font-medium text-[var(--color-ink-on-sea)]"
        >
          <Play className="h-3.5 w-3.5" fill="currentColor" /> {CTA_LABEL[status]}
        </Link>
        <Link
          href={`/kurs/${path.id}`}
          className="shrink-0 rounded-full border border-[var(--color-border)] px-3.5 py-2 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-ivory)]"
        >
          Se steg
        </Link>
      </div>
    </div>
  )
}
