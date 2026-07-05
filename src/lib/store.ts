import { create } from 'zustand'

// Transport state shared between the playback engine and the UI. Key
// highlighting is DERIVED from `currentBeat` by the components (a note sounds
// when t ≤ currentBeat < t + d), so we never track an active-note set here —
// that keeps audio and visuals in sync off a single source of truth.
interface PlayerState {
  isPlaying: boolean
  isLoading: boolean
  currentBeat: number
  set: (patch: Partial<Pick<PlayerState, 'isPlaying' | 'isLoading' | 'currentBeat'>>) => void
}

export const usePlayer = create<PlayerState>((set) => ({
  isPlaying: false,
  isLoading: false,
  currentBeat: 0,
  set: (patch) => set(patch),
}))
