import * as Tone from 'tone'
import type { Lick, HandFilter } from '@/types/lick'
import { transposedNotes } from './transpose'
import { usePlayer } from './store'

// ── Salamander piano sampler (lazy) ──────────────────────────────────────────
// A subset of the Salamander Grand samples (every minor-3rd, A0–C8) hosted on
// the Tone.js CDN; Tone.Sampler pitch-shifts between them. ~loads on first play.
const SALAMANDER_BASE = 'https://tonejs.github.io/audio/salamander/'

function buildSampleMap(): Record<string, string> {
  const roots = ['A', 'C', 'D#', 'F#']
  const map: Record<string, string> = {}
  for (let octave = 0; octave <= 7; octave++) {
    for (const r of roots) {
      // A0 is the lowest sample; C8 the highest.
      if (octave === 0 && (r === 'C' || r === 'D#' || r === 'F#')) continue
      const note = `${r}${octave}`
      const file = `${r.replace('#', 's')}${octave}.mp3`
      map[note] = file
    }
  }
  map['C8'] = 'C8.mp3'
  return map
}

export interface BuildOptions {
  targetKey: number
  hand: HandFilter
  bpm: number
  loop: boolean
}

/**
 * Single global playback engine. Everything is scheduled on Tone.Transport in
 * TICKS (tempo-independent), so BPM can change live without restarting or
 * repitching. Rebuilding is only needed when the key or hand filter changes.
 */
class PlaybackEngine {
  private sampler: Tone.Sampler | null = null
  private part: Tone.Part | null = null
  private raf: number | null = null
  private totalBeats = 0
  private endEvent: number | null = null

  private async ensureSampler(): Promise<Tone.Sampler> {
    if (this.sampler) return this.sampler
    usePlayer.getState().set({ isLoading: true })
    const sampler = new Tone.Sampler({
      urls: buildSampleMap(),
      baseUrl: SALAMANDER_BASE,
      release: 1,
    }).toDestination()
    await Tone.loaded()
    this.sampler = sampler
    usePlayer.getState().set({ isLoading: false })
    return sampler
  }

  /** (Re)build the Tone.Part for a lick in the given key/hand/tempo. */
  build(lick: Lick, opts: BuildOptions) {
    const PPQ = Tone.Transport.PPQ
    const beatToTicks = (beat: number) => Math.round(beat * PPQ) + 'i'

    // Dispose any prior part before replacing.
    this.part?.dispose()

    const notes = transposedNotes(lick, opts.targetKey).filter(
      (n) => opts.hand === 'both' || n.h === opts.hand,
    )

    const events = notes.map((n) => ({
      time: beatToTicks(n.t),
      midi: n.p,
      durTicks: beatToTicks(n.d),
      vel: n.v ?? 0.8,
    }))

    const part = new Tone.Part((time, ev) => {
      const freq = Tone.Frequency(ev.midi, 'midi').toFrequency()
      this.sampler?.triggerAttackRelease(freq, ev.durTicks, time, ev.vel)
    }, events)
    part.start(0)

    this.part = part
    this.totalBeats = lick.beats

    Tone.Transport.bpm.value = opts.bpm
    Tone.Transport.loop = opts.loop
    Tone.Transport.loopStart = 0
    Tone.Transport.loopEnd = beatToTicks(lick.beats)
    this.scheduleEnd(opts.loop)
  }

  // When not looping, stop cleanly one bar-length after the last beat.
  private scheduleEnd(loop: boolean) {
    if (this.endEvent !== null) {
      Tone.Transport.clear(this.endEvent)
      this.endEvent = null
    }
    if (!loop) {
      const PPQ = Tone.Transport.PPQ
      this.endEvent = Tone.Transport.scheduleOnce(() => {
        Tone.Draw.schedule(() => this.stop(), Tone.now())
      }, Math.round(this.totalBeats * PPQ) + 'i')
    }
  }

  setLoop(loop: boolean) {
    Tone.Transport.loop = loop
    this.scheduleEnd(loop)
  }

  /** Live tempo change — no restart, no repitch. */
  setTempo(bpm: number) {
    Tone.Transport.bpm.value = bpm
  }

  /** Trigger a single note now (click / MIDI feedback, wait-mode). */
  async playNote(midi: number, velocity = 0.8, durationSec = 0.6) {
    await Tone.start()
    const sampler = await this.ensureSampler()
    sampler.triggerAttackRelease(Tone.Frequency(midi, 'midi').toFrequency(), durationSec, undefined, velocity)
  }

  async play() {
    await Tone.start()
    await this.ensureSampler()
    Tone.Transport.start()
    usePlayer.getState().set({ isPlaying: true })
    this.tick()
  }

  stop() {
    Tone.Transport.stop()
    Tone.Transport.position = 0
    if (this.raf !== null) cancelAnimationFrame(this.raf)
    this.raf = null
    usePlayer.getState().set({ isPlaying: false, currentBeat: 0 })
  }

  private tick = () => {
    const PPQ = Tone.Transport.PPQ
    const beat = this.totalBeats > 0 ? (Tone.Transport.ticks / PPQ) % this.totalBeats : 0
    usePlayer.getState().set({ currentBeat: beat })
    this.raf = requestAnimationFrame(this.tick)
  }

  /** Tear down (route change). */
  dispose() {
    this.stop()
    this.part?.dispose()
    this.part = null
  }
}

// Singleton — one AudioContext / sampler for the whole app.
let engine: PlaybackEngine | null = null
export function getEngine(): PlaybackEngine {
  if (!engine) engine = new PlaybackEngine()
  return engine
}
