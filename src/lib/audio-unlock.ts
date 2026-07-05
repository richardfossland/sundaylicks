import * as Tone from 'tone'

// iOS Safari Web Audio unlock. Two problems it solves:
//  1) The AudioContext starts 'suspended' and only resumes from a user gesture —
//     and the gesture "credit" is lost during the async sampler load. So we
//     resume + play a silent buffer on the FIRST gesture anywhere on the page,
//     decoupled from playback.
//  2) The physical ring/mute switch silences Web Audio in Safari. Playing a
//     silent looping <audio> element flips the iOS audio session to 'playback'
//     so Web Audio is heard even with the switch on.

let installed = false
let silentTag: HTMLAudioElement | null = null

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    // iPadOS 13+ reports as Mac; detect via touch points.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

// A tiny, valid, fully-silent WAV as a data URI (8-bit mono, centre = 128).
function silentWav(): string {
  const rate = 8000
  const samples = rate / 2 // 0.5s
  const buf = new ArrayBuffer(44 + samples)
  const v = new DataView(buf)
  const ws = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i))
  }
  ws(0, 'RIFF')
  v.setUint32(4, 36 + samples, true)
  ws(8, 'WAVE')
  ws(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true) // PCM
  v.setUint16(22, 1, true) // mono
  v.setUint32(24, rate, true)
  v.setUint32(28, rate, true)
  v.setUint16(32, 1, true)
  v.setUint16(34, 8, true) // 8-bit
  ws(36, 'data')
  v.setUint32(40, samples, true)
  for (let i = 0; i < samples; i++) v.setUint8(44 + i, 128)
  let bin = ''
  const u8 = new Uint8Array(buf)
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i])
  return 'data:audio/wav;base64,' + btoa(bin)
}

/** Resume the Web Audio context now (safe to call from a play handler). */
export async function ensureAudioRunning(): Promise<void> {
  try {
    await Tone.start()
    if (Tone.getContext().state !== 'running') await Tone.getContext().resume()
  } catch {
    /* ignore */
  }
}

/** Install a one-time unlock on the first user gesture. Idempotent. */
export function installAudioUnlock() {
  if (installed || typeof window === 'undefined') return
  installed = true
  const events = ['touchend', 'pointerdown', 'mousedown', 'keydown']

  const unlock = async () => {
    try {
      // (2) ring-switch bypass — iOS only, to avoid a stray media widget elsewhere.
      if (isIOS() && !silentTag) {
        silentTag = new Audio(silentWav())
        silentTag.loop = true
        silentTag.volume = 0.01
        void silentTag.play().catch(() => {})
      }
      // (1) resume + silent buffer to unlock the context.
      await Tone.start()
      const ctx = Tone.getContext().rawContext as AudioContext
      if (ctx.state !== 'running') await ctx.resume()
      const src = ctx.createBufferSource()
      src.buffer = ctx.createBuffer(1, 1, 22050)
      src.connect(ctx.destination)
      src.start(0)
    } catch {
      /* ignore */
    }
    if (Tone.getContext().state === 'running') {
      events.forEach((e) => window.removeEventListener(e, unlock))
    }
  }

  events.forEach((e) => window.addEventListener(e, unlock, { passive: true }))
}
