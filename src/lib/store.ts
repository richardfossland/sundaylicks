import { create } from 'zustand'
import { getPracticeDefaults } from './prefs'

// Transport state shared between the playback engine and the UI. Key
// highlighting is DERIVED from `currentBeat` by the components (a note sounds
// when t ≤ currentBeat < t + d), so we never track an active-note set here —
// that keeps audio and visuals in sync off a single source of truth.
interface PlayerState {
  isPlaying: boolean
  isLoading: boolean
  currentBeat: number
  metronome: boolean // click on every beat during playback
  countIn: boolean // one bar of clicks before playback starts
  set: (
    patch: Partial<Pick<PlayerState, 'isPlaying' | 'isLoading' | 'currentBeat' | 'metronome' | 'countIn'>>,
  ) => void
}

export const usePlayer = create<PlayerState>((set) => ({
  isPlaying: false,
  isLoading: false,
  currentBeat: 0,
  metronome: false,
  countIn: false,
  set: (patch) => set(patch),
}))

// Forhåndsarmer metronom/tell-inn fra brukerens lagrede *standarder* (satt i
// /innstillinger). Modul-guard: kjøres kun ÉN gang per app-økt — TransportBar-
// togglene forblir flyktige, så etter denne hydreringen kan de overstyre
// standarden for økta uten at den skrives tilbake. Kalles fra Practices
// mount-effekt (klient), aldri under server-render.
let practiceDefaultsApplied = false
export function hydratePracticeDefaults() {
  if (practiceDefaultsApplied) return
  practiceDefaultsApplied = true
  const d = getPracticeDefaults()
  usePlayer.setState({ metronome: d.metronome, countIn: d.countIn })
}
