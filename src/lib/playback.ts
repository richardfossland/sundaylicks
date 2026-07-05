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
  swing?: number // 0 = straight, ~0.5 = jazz swing (Tone.Transport.swing)
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
  private metro: Tone.MembraneSynth | null = null
  private metroId: number | null = null
  private loopStartBeat = 0
  private loopEndBeat: number | null = null // null = full length

  private ensureMetro(): Tone.MembraneSynth {
    if (!this.metro) {
      this.metro = new Tone.MembraneSynth({
        octaves: 1.5,
        pitchDecay: 0.008,
        envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.02 },
      }).toDestination()
      this.metro.volume.value = -6
    }
    return this.metro
  }

  private click(time: number, accent: boolean) {
    this.ensureMetro().triggerAttackRelease(accent ? 'C6' : 'G5', '32n', time, accent ? 0.9 : 0.5)
  }

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
    Tone.Transport.swing = opts.swing ?? 0
    Tone.Transport.swingSubdivision = '8n'
    Tone.Transport.loop = opts.loop
    this.applyLoopRange(beatToTicks)
    this.scheduleEnd(opts.loop)
  }

  private applyLoopRange(beatToTicks: (b: number) => string) {
    const end = this.loopEndBeat === null ? this.totalBeats : Math.min(this.loopEndBeat, this.totalBeats)
    Tone.Transport.loopStart = beatToTicks(Math.max(0, this.loopStartBeat))
    Tone.Transport.loopEnd = beatToTicks(end)
  }

  /** A-B section loop: pass (null, null) to reset to the full lick. */
  setLoopRange(startBeat: number | null, endBeat: number | null) {
    this.loopStartBeat = startBeat ?? 0
    this.loopEndBeat = endBeat
    const PPQ = Tone.Transport.PPQ
    this.applyLoopRange((b) => Math.round(b * PPQ) + 'i')
  }

  setSwing(v: number) {
    Tone.Transport.swing = v
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

    // Optional one-bar count-in before the transport starts.
    const now = Tone.now()
    const spb = 60 / Tone.Transport.bpm.value
    let startTime = now
    if (usePlayer.getState().countIn) {
      for (let i = 0; i < 4; i++) this.click(now + i * spb, i === 0)
      startTime = now + 4 * spb
    }

    // Metronome: one scheduled repeat, gated live on the store flag so toggling
    // during playback takes effect immediately. Accent the downbeat of each bar.
    if (this.metroId !== null) Tone.Transport.clear(this.metroId)
    this.metroId = Tone.Transport.scheduleRepeat((time) => {
      if (!usePlayer.getState().metronome) return
      const beat = Math.round(Tone.Transport.getTicksAtTime(time) / Tone.Transport.PPQ)
      this.click(time, beat % 4 === 0)
    }, '4n', 0)

    // Start at the A point when a section loop is active.
    const offsetTicks = Math.round(this.loopStartBeat * Tone.Transport.PPQ)
    Tone.Transport.start(startTime, `${offsetTicks}i`)
    usePlayer.getState().set({ isPlaying: true })
    this.tick()
  }

  stop() {
    Tone.Transport.stop()
    Tone.Transport.position = 0
    if (this.metroId !== null) {
      Tone.Transport.clear(this.metroId)
      this.metroId = null
    }
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
