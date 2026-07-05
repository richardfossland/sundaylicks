// Web MIDI input (native, no dependency). PLAN §4/§6 Fase 3.
// Chrome/Edge support requestMIDIAccess; Safari/Firefox do not — callers should
// feature-detect with `midiSupported()` and fall back to the on-screen keyboard.

export function midiSupported(): boolean {
  return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator
}

type NoteHandler = (midi: number, velocity: number) => void

export interface MidiConnection {
  deviceNames: string[]
  dispose: () => void
}

interface MidiLike {
  inputs: Map<string, { name?: string | null; onmidimessage: ((e: { data: Uint8Array }) => void) | null }>
  onstatechange: (() => void) | null
}

/**
 * Request MIDI access and route every note-on to `onNote`. Resolves with the
 * connected device names and a disposer. Rejects if unsupported or denied.
 */
export async function connectMidi(onNote: NoteHandler): Promise<MidiConnection> {
  if (!midiSupported()) throw new Error('Web MIDI støttes ikke i denne nettleseren')

  // @ts-expect-error requestMIDIAccess is not in the ambient TS lib here.
  const access = (await navigator.requestMIDIAccess({ sysex: false })) as MidiLike

  const attach = () => {
    for (const input of access.inputs.values()) {
      input.onmidimessage = (e: { data: Uint8Array }) => {
        const [status, note, vel] = e.data
        // 0x90 = note-on; a note-on with velocity 0 is a note-off.
        if ((status & 0xf0) === 0x90 && vel > 0) onNote(note, vel / 127)
      }
    }
  }
  attach()
  access.onstatechange = attach

  const names: string[] = []
  for (const input of access.inputs.values()) names.push(input.name || 'MIDI-enhet')

  return {
    deviceNames: names,
    dispose: () => {
      for (const input of access.inputs.values()) input.onmidimessage = null
      access.onstatechange = null
    },
  }
}
