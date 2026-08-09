// Instrument-registeret — bevisst avhengighetsfritt (ingen Tone-import) slik at
// UI (TransportBar/AppShell) og session-persistering kan importere det uten å
// dra lydmotoren inn i bundelen eller skape sirkulære importer. Selve
// Tone-nodene bygges i playback.ts.
//
// Navnene er generiske og varemerke-frie med vilje: «El-piano» og «Pad» — ikke
// produktnavn. 'piano', 'gitar' og 'bass' bruker samples ('piano' fra Tone-CDN,
// 'gitar'/'bass' self-hostet under public/samples/); de to andre er syntetisert
// lokalt og laster øyeblikkelig.

export type InstrumentKind = 'piano' | 'gitar' | 'bass' | 'elpiano' | 'pad'

export const INSTRUMENT_ORDER: InstrumentKind[] = ['piano', 'gitar', 'bass', 'elpiano', 'pad']

export const INSTRUMENT_LABEL: Record<InstrumentKind, string> = {
  piano: 'Piano',
  gitar: 'Gitar',
  bass: 'Bass',
  elpiano: 'El-piano',
  pad: 'Pad',
}

export function isValidInstrument(v: unknown): v is InstrumentKind {
  return v === 'piano' || v === 'gitar' || v === 'bass' || v === 'elpiano' || v === 'pad'
}

/** Lyden et fretted lick KREVER, eller null for piano/ukjent. Tar `string` fordi
 * `Lick.instrument` er fritekst på DB-laget (se 0005_instrument.sql). */
export function frettedInstrument(lickInstrument: string | undefined | null): InstrumentKind | null {
  return lickInstrument === 'gitar' ? 'gitar' : lickInstrument === 'bass' ? 'bass' : null
}

/** Lyden en lick skal spilles med: et fretted lick bærer sin egen (gitar/bass),
 * alt annet spilles med brukerens valgte lyd. Regelen bodde tidligere kun i
 * Practice — den hører hjemme her, slik at reel, oppslagsverk og /spill får
 * samme svar uten å duplisere den. */
export function instrumentForLick(
  lickInstrument: string | undefined | null,
  fallback: InstrumentKind,
): InstrumentKind {
  return frettedInstrument(lickInstrument) ?? fallback
}
