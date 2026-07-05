import type { Category, Genre, Difficulty } from '@/types/lick'

export const CATEGORY_LABEL: Record<Category, string> = {
  turnaround: 'Turnaround',
  'two-five-one': '2-5-1',
  run: 'Run',
  fill: 'Fill',
  ending: 'Avslutning',
  intro: 'Intro',
  comp: 'Komp',
  groove: 'Groove',
}

export const CATEGORY_ORDER: Category[] = [
  'intro', 'turnaround', 'two-five-one', 'run', 'fill', 'ending', 'comp', 'groove',
]

export const GENRE_LABEL: Record<Genre, string> = {
  gospel: 'Gospel',
  worship: 'Lovsang',
  jazz: 'Jazz',
  blues: 'Blues',
  boogie: 'Boogie-woogie',
  neosoul: 'Neo-soul',
  latin: 'Latin',
  classical: 'Klassisk',
  rock: 'Rock/Pop',
}

export const GENRE_ORDER: Genre[] = [
  'gospel', 'worship', 'jazz', 'blues', 'boogie', 'neosoul', 'latin', 'classical', 'rock',
]

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  1: 'Nybegynner',
  2: 'Middels',
  3: 'Avansert',
}

export function difficultyDots(d: Difficulty): string {
  return '●'.repeat(d) + '○'.repeat(3 - d)
}
