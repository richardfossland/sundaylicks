// Transposisjons-invariant fingeravtrykk av en licks noteinnhold — brukt av
// seed-similarity.test.ts som varig vakthund mot at biblioteket samler
// duplikater/nær-duplikater igjen (kurateringsrunden 2026-07-10 fjernet 10 slike;
// bl.a. var «fill-worship-e» en 100 % identisk transponering av «worship-fill»).
//
// Avtrykket er et sett av tokens `relT:relP:d:h` der tid er relativ til første
// anslag og pitch relativ til lickens laveste tone — så samme materiale i en
// annen toneart/oktav gir identisk avtrykk. Velocity utelates bevisst: to licks
// som bare skiller seg i dynamikk ER samme lick.

import type { LickNote } from '@/types/lick'

/** Sett av posisjons-/intervall-tokens for notene — transposisjons-invariant. */
export function fingerprint(notes: readonly LickNote[]): Set<string> {
  if (notes.length === 0) return new Set()
  const t0 = Math.min(...notes.map((n) => n.t))
  const p0 = Math.min(...notes.map((n) => n.p))
  const out = new Set<string>()
  for (const n of notes) {
    out.add(`${round2(n.t - t0)}:${n.p - p0}:${round2(n.d)}:${n.h}`)
  }
  return out
}

/** Jaccard-likhet mellom to avtrykk: |snitt| / |union|, 0–1. */
export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  let inter = 0
  for (const token of a) if (b.has(token)) inter++
  return inter / (a.size + b.size - inter)
}

function round2(x: number): number {
  return Math.round(x * 100) / 100
}
