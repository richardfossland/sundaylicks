// Data for de to lyd-stegene i onboarding. REN DATA — ingen JSX, ingen Tone-
// import (samme invariant som data/glossary-demos.ts). Avspillingen skjer i
// OnboardingSteps via useDemoPlayer, som lastes `dynamic({ ssr:false })`.

import type { DemoPhrase } from '@/data/glossary-demos'

/**
 * Velkomst-frasen (steg 2 «Hør en lick»): en liten gospel-walkup i C-dur over
 * fire slag. Høyre hånd vandrer oppover og treffer den karakteristiske b3→3-
 * kromatikken (Eb → E) på vei mot kvinten — en lyd de fleste kjenner igjen fra
 * lovsang og gospel. Swinget åttedelsfølelse, rolig bpm 100.
 */
export const WELCOME_PHRASE: DemoPhrase = {
  beats: 4,
  bpm: 100,
  swing: 0.5,
  notes: [
    { p: 60, t: 0, d: 0.5, h: 'R', v: 0.85 }, // C
    { p: 62, t: 0.5, d: 0.5, h: 'R', v: 0.8 }, // D
    { p: 63, t: 1, d: 0.5, h: 'R', v: 0.8 }, // Eb  (b3)
    { p: 64, t: 1.5, d: 0.5, h: 'R', v: 0.85 }, // E   (3 — kromatisk pass)
    { p: 67, t: 2, d: 0.5, h: 'R', v: 0.9 }, // G
    { p: 69, t: 2.5, d: 0.5, h: 'R', v: 0.8 }, // A
    { p: 67, t: 3, d: 0.5, h: 'R', v: 0.8 }, // G
    { p: 64, t: 3.5, d: 0.5, h: 'R', v: 0.85 }, // E  (lander mykt på tersen)
  ],
}

/**
 * Vent-modus-demoen (steg 4 «Bla og øv»): de tre tonene brukeren tapper etter
 * tur — C-dur-treklangen (C, E, G). MiniKeyboard lyser én om gangen; riktig tapp
 * spiller tonen og går videre, feil tapp gjør ingenting (akkurat som ekte
 * vent-modus i øvingssiden).
 */
export const WAIT_DEMO_PITCHES: number[] = [60, 64, 67]
