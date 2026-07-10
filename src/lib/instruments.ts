// Instrument-registeret — bevisst avhengighetsfritt (ingen Tone-import) slik at
// UI (TransportBar/AppShell) og session-persistering kan importere det uten å
// dra lydmotoren inn i bundelen eller skape sirkulære importer. Selve
// Tone-nodene bygges i playback.ts.
//
// Navnene er generiske og varemerke-frie med vilje: «El-piano» og «Pad» — ikke
// produktnavn. Kun 'piano' bruker samples (Salamander via Tone-CDN); de to
// andre er syntetisert lokalt og laster øyeblikkelig.

export type InstrumentKind = 'piano' | 'elpiano' | 'pad'

export const INSTRUMENT_ORDER: InstrumentKind[] = ['piano', 'elpiano', 'pad']

export const INSTRUMENT_LABEL: Record<InstrumentKind, string> = {
  piano: 'Piano',
  elpiano: 'El-piano',
  pad: 'Pad',
}

export function isValidInstrument(v: unknown): v is InstrumentKind {
  return v === 'piano' || v === 'elpiano' || v === 'pad'
}
