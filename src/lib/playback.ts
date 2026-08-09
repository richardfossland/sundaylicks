import * as Tone from 'tone'
import type { Lick, HandFilter } from '@/types/lick'
import { frettedInstrument, type InstrumentKind } from './instruments'
import { transposedPlayableNotes } from './transpose'
import { usePlayer } from './store'
import { ensureAudioRunning } from './audio-unlock'

// ── Instrumenter (lazy, cachet per kind) ─────────────────────────────────────
// 'piano'   — Salamander Grand-samples (hver liten ters, A0–C8) fra Tone-CDN.
// 'gitar'   — akustisk gitar, self-hostet liten-ters-subset A2–C5 fra
//             public/samples/gitar/ (CC-BY).
// 'bass'    — el-bass, self-hostet subset E1–G3 fra public/samples/bass/ (CC-BY,
//             tonejs-instruments bass-electric). Piano, gitar og bass er de med
//             nettverkslast → de eneste som rører isLoading.
// 'elpiano' — FM-syntetisert elektrisk piano (generisk navn, ingen varemerker).
// 'pad'     — myk fatsawtooth-flate m/ sakte attack → romklang.
// Noder DISPOSES ALDRI ved bytte: de caches per kind, så bytte-tilbake-til-piano
// er øyeblikkelig (ingen CDN-reload). setInstrument() gjør releaseAll() på
// forrige node så hengende toner kuttes midt i avspilling, OG bygger den nye
// noden med én gang — Part-tilbakekallet slår opp noden per event, og en tom
// cache betyr stille toner (se ensureInstrument/Part-tilbakekallet).
const SALAMANDER_BASE = 'https://tonejs.github.io/audio/salamander/'

type InstrumentNode = Tone.Sampler | Tone.PolySynth

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
  /** Lyden denne Parten skal spilles med. Utelates den, beholder motoren
   * gjeldende lyd — MEN et fretted lick drar alltid med seg sin egen (gitar/
   * bass). Regelen bor her, ikke i én enkelt side, slik at reel, oppslagsverk,
   * /spill og admin-forhåndsvisning spiller en bass-lick med bass-lyd. */
  instrument?: InstrumentKind
}

/**
 * Single global playback engine. Everything is scheduled on Tone.Transport in
 * TICKS (tempo-independent), so BPM can change live without restarting or
 * repitching. Rebuilding is only needed when the key or hand filter changes.
 */
class PlaybackEngine {
  private kind: InstrumentKind = 'piano'
  private nodes: Partial<Record<InstrumentKind, InstrumentNode>> = {}
  /** Bygg som er underveis, per kind — så to samtidige ensureInstrument() for
   * samme lyd deler én node i stedet for å bygge (og laste) den to ganger. */
  private pending: Partial<Record<InstrumentKind, Promise<InstrumentNode>>> = {}
  /**
   * Sant mens en side eier lyden lokalt (Practices D5b-overstyring). AppShell
   * speiler den globale sesjons-lyden inn i motoren ved hver montering, og
   * hopper over når dette flagget står — ellers ville rekkefølgen mellom
   * sesjons-hydreringen og Practices montering avgjøre hvilken lyd som vinner.
   * I dag går det bra fordi Practice er dynamisk importert (monterer sist);
   * flagget gjør avhengigheten eksplisitt i stedet for tilfeldig.
   */
  pageOverrideActive = false
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

  /** Bytt aktivt instrument. Cachet node beholdes; forrige slippes (releaseAll). */
  setInstrument(kind: InstrumentKind) {
    if (kind === this.kind) return
    this.nodes[this.kind]?.releaseAll()
    this.kind = kind
    // Bygg noden med én gang. Uten dette peker Part-tilbakekallet på en tom
    // cache og dropper HVER tone stille til noe annet tilfeldigvis kaller
    // ensureInstrument() — f.eks. bytte av lyd midt i avspilling, eller
    // liste-navigasjon fra et piano-lick til et gitar-lick. ensureInstrument()
    // er idempotent og selv-cachende, så gjentatte kall er gratis.
    void this.ensureInstrument().catch(() => {})
  }

  /** Bygg (eller hent fra cache) noden for gjeldende lyd. Idempotent. */
  private ensureInstrument(): Promise<InstrumentNode> {
    const kind = this.kind
    const cached = this.nodes[kind]
    if (cached) return Promise.resolve(cached)
    const inflight = this.pending[kind]
    if (inflight) return inflight
    // Bind resultatet til kind-en vi startet med: et lyd-bytte under den
    // asynkrone lastingen skal ikke lagre noden under feil nøkkel.
    const p = this.buildInstrument(kind)
      .then((node) => {
        this.nodes[kind] = node
        return node
      })
      .finally(() => {
        delete this.pending[kind]
      })
    this.pending[kind] = p
    return p
  }

  private async buildInstrument(kind: InstrumentKind): Promise<InstrumentNode> {
    let node: InstrumentNode
    if (kind === 'piano') {
      // Eneste instrument med nettverkslast → eneste som setter isLoading.
      usePlayer.getState().set({ isLoading: true })
      node = new Tone.Sampler({
        urls: buildSampleMap(),
        baseUrl: SALAMANDER_BASE,
        release: 1,
      }).toDestination()
      await Tone.loaded()
      usePlayer.getState().set({ isLoading: false })
    } else if (kind === 'gitar') {
      // Akustisk gitar — self-hostet liten-ters-subset A2–C5 fra public/samples/
      // gitar/ (CC-BY, tonejs-instruments/Iowa). Nettverkslast som piano → rører
      // isLoading; Sampler ekstrapolerer opp/ned mellom samplene.
      usePlayer.getState().set({ isLoading: true })
      node = new Tone.Sampler({
        urls: {
          A2: 'A2.mp3',
          C3: 'C3.mp3',
          'D#3': 'Ds3.mp3',
          'F#3': 'Fs3.mp3',
          A3: 'A3.mp3',
          C4: 'C4.mp3',
          'D#4': 'Ds4.mp3',
          'F#4': 'Fs4.mp3',
          A4: 'A4.mp3',
          C5: 'C5.mp3',
        },
        baseUrl: '/samples/gitar/',
        release: 1,
      }).toDestination()
      await Tone.loaded()
      usePlayer.getState().set({ isLoading: false })
    } else if (kind === 'bass') {
      // El-bass — self-hostet E1–G3-subset fra public/samples/bass/ (CC-BY,
      // tonejs-instruments bass-electric; native grid E/G/A#/C#). Nettverkslast
      // som piano/gitar → rører isLoading; Sampler ekstrapolerer mellom samplene.
      usePlayer.getState().set({ isLoading: true })
      node = new Tone.Sampler({
        urls: {
          E1: 'E1.mp3',
          G1: 'G1.mp3',
          'A#1': 'As1.mp3',
          'C#2': 'Cs2.mp3',
          E2: 'E2.mp3',
          G2: 'G2.mp3',
          'A#2': 'As2.mp3',
          'C#3': 'Cs3.mp3',
          E3: 'E3.mp3',
          G3: 'G3.mp3',
        },
        baseUrl: '/samples/bass/',
        release: 0.6,
      }).toDestination()
      await Tone.loaded()
      usePlayer.getState().set({ isLoading: false })
    } else if (kind === 'elpiano') {
      const ep = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3,
        modulationIndex: 14,
        envelope: { attack: 0.002, decay: 1.2, sustain: 0.1, release: 1.2 },
        modulationEnvelope: { attack: 0.002, decay: 0.3, sustain: 0, release: 0.4 },
      })
      ep.maxPolyphony = 24
      ep.volume.value = -6
      ep.toDestination()
      node = ep
    } else {
      const pad = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth', count: 3, spread: 24 },
        envelope: { attack: 0.6, decay: 0.4, sustain: 0.8, release: 1.8 },
      })
      pad.maxPolyphony = 16
      pad.volume.value = -14
      const verb = new Tone.Reverb({ decay: 3.5, wet: 0.35 }).toDestination()
      await verb.ready // impulsen genereres asynkront — vent så wet-delen er med fra første tone
      pad.connect(verb)
      node = pad
    }
    return node
  }

  /** (Re)build the Tone.Part for a lick in the given key/hand/tempo. */
  build(lick: Lick, opts: BuildOptions) {
    const PPQ = Tone.Transport.PPQ
    const beatToTicks = (beat: number) => Math.round(beat * PPQ) + 'i'

    // Lyden hører til innholdet: en eksplisitt `instrument` fra kalleren vinner
    // (Practices side-lokale D5b-valg), ellers drar et fretted lick med seg sin
    // egen. Uten dette spilte /bla, oppslagsverket og /spill gitar- og
    // bass-licks med piano-lyd.
    const wanted = opts.instrument ?? frettedInstrument(lick.instrument)
    if (wanted) this.setInstrument(wanted)

    // Dispose any prior part before replacing.
    this.part?.dispose()

    const notes = transposedPlayableNotes(lick, opts.targetKey).filter(
      (n) => opts.hand === 'both' || n.h === opts.hand,
    )

    const events = notes.map((n) => ({
      time: beatToTicks(n.t),
      midi: n.p,
      durTicks: beatToTicks(n.d),
      vel: n.v ?? 0.8,
    }))

    const part = new Tone.Part((time, ev) => {
      // Leses dynamisk per event → instrumentbytte trenger aldri Part-rebuild.
      const node = this.nodes[this.kind]
      if (!node) {
        // Cache-bom: noden er ikke bygget (ennå). Fyr av byggingen uten å vente
        // — tonene kommer tilbake av seg selv når den er klar, i stedet for at
        // resten av licken går stille.
        void this.ensureInstrument().catch(() => {})
        return
      }
      const freq = Tone.Frequency(ev.midi, 'midi').toFrequency()
      node.triggerAttackRelease(freq, ev.durTicks, time, ev.vel)
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
    await ensureAudioRunning()
    const inst = await this.ensureInstrument()
    await ensureAudioRunning() // context can suspend during the async sampler load (iOS)
    inst.triggerAttackRelease(Tone.Frequency(midi, 'midi').toFrequency(), durationSec, undefined, velocity)
  }

  async play() {
    await ensureAudioRunning()
    await this.ensureInstrument()
    await ensureAudioRunning() // re-resume after the async load — iOS Safari suspends

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
    // A-B-området er side-lokalt (Practice). Uten nullstilling her arvet neste
    // side motorens gamle loop-punkter: reel og oppslagsverk-demoer startet på
    // takt A og ble kuttet ved B.
    this.loopStartBeat = 0
    this.loopEndBeat = null
  }
}

// Singleton — one AudioContext / sampler for the whole app.
let engine: PlaybackEngine | null = null
export function getEngine(): PlaybackEngine {
  if (!engine) engine = new PlaybackEngine()
  return engine
}
