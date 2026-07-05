import type { Lick } from '@/types/lick'
import { transposedNotes } from './transpose'

// Minimal, dependency-free Standard MIDI File (type 0) writer. Encodes a lick
// (transposed to targetKey, at the given bpm) as a downloadable .mid.

const PPQ = 480 // ticks per quarter note

function vlq(value: number): number[] {
  const bytes = [value & 0x7f]
  let v = value >> 7
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80)
    v >>= 7
  }
  return bytes
}

function str(s: string): number[] {
  return [...s].map((c) => c.charCodeAt(0))
}

function u32(n: number): number[] {
  return [(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

interface Ev {
  tick: number
  kind: 0 | 1 // 0 = note-off (sort first at a tick), 1 = note-on
  data: number[]
}

/** Build the .mid bytes for a lick at a given key/tempo. */
export function lickToMidi(lick: Lick, targetKey: number, bpm: number): Uint8Array {
  const notes = transposedNotes(lick, targetKey)
  const evs: Ev[] = []
  for (const n of notes) {
    const on = Math.round(n.t * PPQ)
    const off = Math.round((n.t + n.d) * PPQ)
    const vel = Math.max(1, Math.min(127, Math.round((n.v ?? 0.8) * 127)))
    evs.push({ tick: on, kind: 1, data: [0x90, n.p, vel] })
    evs.push({ tick: off, kind: 0, data: [0x80, n.p, 0] })
  }
  // Sort by tick; at equal ticks, note-offs before note-ons.
  evs.sort((a, b) => a.tick - b.tick || a.kind - b.kind)

  const track: number[] = []
  // Tempo meta: FF 51 03 <microseconds per quarter>
  const uspq = Math.round(60000000 / bpm)
  track.push(0x00, 0xff, 0x51, 0x03, (uspq >> 16) & 0xff, (uspq >> 8) & 0xff, uspq & 0xff)

  let last = 0
  for (const e of evs) {
    track.push(...vlq(e.tick - last), ...e.data)
    last = e.tick
  }
  track.push(0x00, 0xff, 0x2f, 0x00) // end of track

  const header = [...str('MThd'), ...u32(6), 0x00, 0x00, 0x00, 0x01, (PPQ >> 8) & 0xff, PPQ & 0xff]
  const trackChunk = [...str('MTrk'), ...u32(track.length), ...track]
  return new Uint8Array([...header, ...trackChunk])
}

export function downloadMidi(lick: Lick, targetKey: number, bpm: number) {
  const bytes = lickToMidi(lick, targetKey, bpm)
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'audio/midi' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${lick.slug}.mid`
  a.click()
  URL.revokeObjectURL(url)
}
