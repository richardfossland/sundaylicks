import { describe, expect, it } from 'vitest'
import { CURATED_PATHS } from '@/data/curated-paths'
import { computeAllCourseProgress, computeCourseProgress, pickContinueCourse, resumeStep } from './course-progress'

const path = CURATED_PATHS[0] // p_beginner: 6 slugs

describe('computeCourseProgress', () => {
  it('is not-started with no practiced slugs', () => {
    const p = computeCourseProgress(path, [])
    expect(p.doneCount).toBe(0)
    expect(p.pct).toBe(0)
    expect(p.status).toBe('not-started')
    expect(p.nextIndex).toBe(0)
  })

  it('is in-progress once some (but not all) slugs are practiced', () => {
    const p = computeCourseProgress(path, [path.slugs[0]])
    expect(p.doneCount).toBe(1)
    expect(p.status).toBe('in-progress')
    expect(p.nextIndex).toBe(1)
  })

  it('finds the first UNPRACTICED step even if a later step was done out of order', () => {
    // user jumped ahead and practiced step 2 without doing step 0/1
    const p = computeCourseProgress(path, [path.slugs[2]])
    expect(p.doneCount).toBe(1)
    expect(p.status).toBe('in-progress')
    expect(p.nextIndex).toBe(0)
  })

  it('is done once every slug is practiced, with nextIndex null', () => {
    const p = computeCourseProgress(path, path.slugs)
    expect(p.doneCount).toBe(path.slugs.length)
    expect(p.pct).toBe(100)
    expect(p.status).toBe('done')
    expect(p.nextIndex).toBeNull()
  })
})

describe('computeAllCourseProgress', () => {
  it('returns one entry per curated course, in catalogue order', () => {
    const all = computeAllCourseProgress([])
    expect(all).toHaveLength(CURATED_PATHS.length)
    expect(all.map((c) => c.path.id)).toEqual(CURATED_PATHS.map((p) => p.id))
    expect(all.every((c) => c.status === 'not-started')).toBe(true)
  })
})

describe('pickContinueCourse', () => {
  it('returns null when nothing is in progress', () => {
    expect(pickContinueCourse(computeAllCourseProgress([]))).toBeNull()
  })

  it('returns null when every course is fully practiced', () => {
    const everySlug = CURATED_PATHS.flatMap((p) => p.slugs)
    expect(pickContinueCourse(computeAllCourseProgress(everySlug))).toBeNull()
  })

  it('picks the first in-progress course in catalogue order', () => {
    // p_blues (index 3) and p_neosoul (index 4) share no slugs with each
    // other or with earlier courses — practicing one step from each should
    // put both "in progress" without accidentally touching a 3rd course too.
    const blues = CURATED_PATHS.find((p) => p.id === 'p_blues')!
    const neosoul = CURATED_PATHS.find((p) => p.id === 'p_neosoul')!
    const practiced = [neosoul.slugs[0], blues.slugs[1]]
    const picked = pickContinueCourse(computeAllCourseProgress(practiced))
    expect(picked?.path.id).toBe(blues.id)
  })
})

describe('resumeStep', () => {
  it('resumes at the next unplayed step', () => {
    const p = computeCourseProgress(path, [path.slugs[0]])
    expect(resumeStep(p)).toEqual({ slug: path.slugs[1], index: 1 })
  })

  it('restarts at step 0 for a not-started or fully-done course', () => {
    const notStarted = computeCourseProgress(path, [])
    expect(resumeStep(notStarted)).toEqual({ slug: path.slugs[0], index: 0 })

    const done = computeCourseProgress(path, path.slugs)
    expect(resumeStep(done)).toEqual({ slug: path.slugs[0], index: 0 })
  })
})
