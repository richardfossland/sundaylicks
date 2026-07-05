import type { Category, Difficulty } from '@/types/lick'

export const CATEGORY_LABEL: Record<Category, string> = {
  turnaround: 'Turnaround',
  'two-five-one': '2-5-1',
  run: 'Run',
  fill: 'Fill',
  ending: 'Avslutning',
  intro: 'Intro',
}

export const CATEGORY_ORDER: Category[] = [
  'intro', 'turnaround', 'two-five-one', 'run', 'fill', 'ending',
]

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  1: 'Nybegynner',
  2: 'Middels',
  3: 'Avansert',
}

export function difficultyDots(d: Difficulty): string {
  return '●'.repeat(d) + '○'.repeat(3 - d)
}
