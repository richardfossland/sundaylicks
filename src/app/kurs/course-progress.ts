// ── /kurs — pure progress logic ─────────────────────────────────────────────
//
// Turns `CURATED_PATHS` + the local practice log (`@/lib/progress`) into the
// small view-model the Kurs-modus pages need: how far along each course is,
// which step to resume at, and which course (if any) to feature in
// "Fortsett der du slapp". Defined LOCALLY for this workstream (W3), same
// pattern as workstream E's `transitions/adapter.ts` — kept out of the
// shared `@/lib` tree since nothing else needs it, but still plain/testable.

import { CURATED_PATHS, type CuratedPath } from '@/data/curated-paths'

export type CourseStatus = 'not-started' | 'in-progress' | 'done'

export interface CourseProgress {
  path: CuratedPath
  doneCount: number
  totalCount: number
  /** 0–100, rounded. */
  pct: number
  /** Index of the first not-yet-practiced step, or `null` when every step
   * has been practiced (course complete). */
  nextIndex: number | null
  status: CourseStatus
}

/** Progress for a single course against a list of practiced slugs. */
export function computeCourseProgress(path: CuratedPath, practiced: string[]): CourseProgress {
  const practicedSet = new Set(practiced)
  const doneCount = path.slugs.filter((s) => practicedSet.has(s)).length
  const totalCount = path.slugs.length
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0
  const firstUndone = path.slugs.findIndex((s) => !practicedSet.has(s))
  const nextIndex = firstUndone === -1 ? null : firstUndone
  const status: CourseStatus = doneCount === 0 ? 'not-started' : nextIndex === null ? 'done' : 'in-progress'
  return { path, doneCount, totalCount, pct, nextIndex, status }
}

/** Progress for every curated course, in `CURATED_PATHS` order. */
export function computeAllCourseProgress(practiced: string[]): CourseProgress[] {
  return CURATED_PATHS.map((path) => computeCourseProgress(path, practiced))
}

/**
 * Which course to feature in "Fortsett der du slapp" — the first course (in
 * catalogue order) that's been started but not finished. Mirrors the
 * launcher's existing `inProgressPath` pick (see `src/app/page.tsx`) so the
 * two "continue" surfaces never disagree.
 */
export function pickContinueCourse(all: CourseProgress[]): CourseProgress | null {
  return all.find((c) => c.status === 'in-progress') ?? null
}

/** The step to resume a course at: its next unplayed slug, or step 0 if the
 * course hasn't been started (or has been fully completed and is restarting). */
export function resumeStep(progress: CourseProgress): { slug: string; index: number } {
  const index = progress.nextIndex ?? 0
  return { slug: progress.path.slugs[index] ?? progress.path.slugs[0], index }
}
