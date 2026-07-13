// Kuraterte akkordprogresjoner — 40 håndplukkede rundganger til Krydre-fanens
// «Populære progresjoner»-velger. Ett trykk fyller progresjonsbyggeren i din
// toneart, og appen genererer fills/reharm/voicing-forslag over hele rekka.
//
// KILDE OG LISENS: Progresjonene er kuratert og konvertert fra det åpne
// prosjektet «free-midi-chords» av Ludovic Drolez —
//   https://github.com/ldrolez/free-midi-chords
// — utgitt under MIT-lisensen (Copyright (c) 2019-2026 Ludovic Drolez).
// Vi redistribuerer ingen MIDI-filer; romertall-sekvensene er konvertert til
// appens egne datastrukturer (offset i halvtoner fra tonika + kvalitet fra
// music.ts-vokabularet), navngitt og mood-oversatt til norsk av oss. Eksotiske
// kvaliteter i kilden (69, 7-9, madd9 …) er forenklet til nærmeste kvalitet
// appen kjenner. Takk, Ludovic!
//
// `offset` er halvtoner fra tonika (0–11) i DUR-kontekst uansett modus —
// moll-progresjoner («Moll …»-navnene) bruker offsets fra parallell-tolkningen
// slik kilden noterer dem (i=0, III=3, iv=5, v=7, VI=8, VII=10).

export interface ProgressionStepDef {
  /** Halvtoner fra tonika, 0–11. */
  offset: number
  /** Akkordkvalitet fra music.ts-vokabularet ('' = dur, 'm' = moll, …). */
  quality: string
  /** Romertall til visning (kildens notasjon, lett normalisert). */
  roman: string
}

export interface CuratedProgression {
  id: string
  /** Norsk navn — beskrivende, ikke kildens (kilden navngir ikke). */
  name: string
  /** Norsk mood-oversettelse av kildens tags. */
  mood: string
  steps: ProgressionStepDef[]
}

const S = (offset: number, quality: string, roman: string): ProgressionStepDef => ({ offset, quality, roman })

export const CURATED_PROGRESSIONS: CuratedProgression[] = [
  // ── Dur: pop/lovsang-kjernen ──
  { id: 'firegrepet', name: 'Firegrepet', mood: 'Håpefull, romantisk',
    steps: [S(0,'','I'), S(7,'','V'), S(9,'m','vi'), S(5,'','IV')] },
  { id: 'femtitalls', name: '50-tallsrundgangen', mood: 'Nostalgisk, romantisk',
    steps: [S(0,'','I'), S(9,'m','vi'), S(2,'m','ii'), S(7,'','V')] },
  { id: 'moll-start-pop', name: 'Moll-start-popen', mood: 'Håpefull, romantisk',
    steps: [S(9,'m','vi'), S(5,'','IV'), S(0,'','I'), S(7,'','V')] },
  { id: 'terskjede', name: 'Terskjeden', mood: 'Romantisk, håpefull',
    steps: [S(0,'','I'), S(4,'m','iii'), S(9,'m','vi'), S(5,'','IV')] },
  { id: 'jazzinngangen', name: 'Jazzinngangen', mood: 'Håpefull, triumferende',
    steps: [S(2,'m','ii'), S(7,'','V'), S(0,'','I'), S(5,'','IV')] },
  { id: 'pachelbel-kort', name: 'Pachelbel i kortform', mood: 'Håpefull, glad',
    steps: [S(0,'','I'), S(7,'','V'), S(9,'m','vi'), S(4,'m','iii'), S(5,'','IV')] },
  { id: 'fredelig-fire', name: 'Den fredelige firern', mood: 'Nostalgisk, fredelig',
    steps: [S(5,'','IV'), S(0,'','I'), S(2,'m','ii'), S(9,'m','vi')] },
  { id: 'oppned-fire', name: 'Firegrepet opp-ned', mood: 'Glad, håpefull',
    steps: [S(0,'','I'), S(5,'','IV'), S(9,'m','vi'), S(7,'','V')] },
  { id: 'kvintfall', name: 'Kvintfall-kjeden', mood: 'Romantisk, nostalgisk',
    steps: [S(2,'m7','iim7'), S(7,'7','V7'), S(4,'m7','iiim7'), S(9,'m7','vim7'), S(2,'m7','iim7'), S(7,'7','V7')] },
  { id: 'leken-septim', name: 'Den lekne septimrekka', mood: 'Leken, glad',
    steps: [S(0,'maj7','Imaj7'), S(7,'7','V7'), S(9,'add9','viadd9'), S(5,'maj7','IVmaj7')] },
  { id: 'linjeklisje', name: 'Linjeklisjeen', mood: 'Avslappet, nostalgisk',
    steps: [S(0,'','I'), S(0,'maj7','Imaj7'), S(0,'7','I7'), S(5,'','IV'), S(5,'m','iv'), S(0,'','I')] },
  { id: 'tender-seks', name: 'Den ømme seksern', mood: 'Øm, nostalgisk',
    steps: [S(0,'','I'), S(9,'m','vi'), S(0,'','I'), S(5,'','IV')] },

  // ── Moll: neo-soul/balladelandet ──
  { id: 'moll-epikeren', name: 'Moll-epikeren', mood: 'Nostalgisk, håpefull',
    steps: [S(0,'m','i'), S(8,'','VI'), S(3,'','III'), S(10,'','VII')] },
  { id: 'moll-haap', name: 'Sorg med håp', mood: 'Trist, håpefull',
    steps: [S(0,'m','i'), S(5,'m','iv'), S(8,'','VI'), S(7,'m','v')] },
  { id: 'moll-fall', name: 'Mollfallet', mood: 'Trist, håpefull',
    steps: [S(0,'m','i'), S(8,'','VI'), S(5,'m','iv'), S(7,'m','v')] },
  { id: 'opproereren', name: 'Opprøreren', mood: 'Opprørsk, triumferende',
    steps: [S(0,'m','i'), S(10,'','VII'), S(8,'','VI'), S(10,'','VII')] },
  { id: 'gospel-moll-retur', name: 'Gospel-mollreturen', mood: 'Trist, nostalgisk',
    steps: [S(0,'m','i'), S(5,'m','iv'), S(10,'','VII'), S(0,'m','i')] },
  { id: 'styrket-moll', name: 'Den styrkede mollen', mood: 'Myndig, nostalgisk',
    steps: [S(0,'m','i'), S(3,'','III'), S(10,'','VII'), S(5,'m','iv')] },
  { id: 'fredelig-moll', name: 'Fredelig moll-to-fem', mood: 'Fredelig, nostalgisk',
    steps: [S(2,'m7b5','iiø'), S(7,'m','v'), S(0,'m','i'), S(5,'m','iv')] },
  { id: 'moll-sus-lomme', name: 'Sus-lomma i moll', mood: 'Mystisk, øm',
    steps: [S(0,'m7','im7'), S(5,'sus4','ivsus4'), S(7,'7','V7'), S(0,'sus4','isus4')] },
  { id: 'moll-triumf', name: 'Moll-triumfen', mood: 'Triumferende',
    steps: [S(5,'m','iv'), S(8,'','VI'), S(10,'','VII'), S(0,'m','i')] },
  { id: 'moll-anthem', name: 'Moll-anthemet', mood: 'Triumferende, nostalgisk',
    steps: [S(8,'','VI'), S(10,'','VII'), S(0,'m','i'), S(3,'','III')] },
  { id: 'saar-romantikk', name: 'Sår romantikk', mood: 'Trist, romantisk',
    steps: [S(0,'m','i'), S(10,'','VII'), S(8,'','VI'), S(5,'m','iv')] },
  { id: 'oem-moll', name: 'Den ømme mollrekka', mood: 'Håpefull, øm',
    steps: [S(8,'','VI'), S(5,'m','iv'), S(0,'m','i'), S(7,'m','v')] },
  { id: 'moll-septimflyt', name: 'Moll-septimflyten', mood: 'Nostalgisk, romantisk',
    steps: [S(0,'m7','im7'), S(10,'','VII'), S(8,'maj7','VImaj7'), S(5,'m7','ivm7')] },
  { id: 'doedsmarsj-lys', name: 'Mørk vandring', mood: 'Mystisk, mørk',
    steps: [S(7,'m','v'), S(0,'m','i'), S(5,'m','iv'), S(10,'','VII')] },

  // ── Modal/soul/gospel-farger ──
  { id: 'soul-loeftet', name: 'Soul-løftet', mood: 'Triumferende, mystisk',
    steps: [S(0,'','I'), S(3,'','bIII'), S(10,'','bVII'), S(5,'','IV')] },
  { id: 'mixolydisk-rund', name: 'Mixolydisk rundgang', mood: 'Glad, triumferende',
    steps: [S(0,'','I'), S(10,'','bVII'), S(5,'','IV'), S(7,'','V')] },
  { id: 'rock-kirken', name: 'Rockekirken', mood: 'Glad, opprørsk',
    steps: [S(0,'','I'), S(5,'','IV'), S(10,'','bVII'), S(5,'','IV')] },
  { id: 'gospel-fargelegging', name: 'Gospel-fargeleggingen', mood: 'Romantisk, nostalgisk',
    steps: [S(0,'','I'), S(0,'maj7','Imaj7'), S(0,'9','I9'), S(5,'','IV'), S(5,'m','iv')] },
  { id: 'dorisk-soul', name: 'Dorisk soul', mood: 'Romantisk, nostalgisk',
    steps: [S(0,'m','i'), S(3,'','bIII'), S(10,'','bVII'), S(5,'','IV')] },
  { id: 'haapets-moll', name: 'Håpets mollrunde', mood: 'Håpefull, nostalgisk',
    steps: [S(0,'m','i'), S(7,'m','v'), S(10,'','bVII'), S(5,'','IV')] },
  { id: 'moll-kadenskjede', name: 'Moll-kadenskjeden', mood: 'Triumferende',
    steps: [S(0,'m','i'), S(8,'','bVI'), S(5,'m','iv'), S(7,'','V')] },
  { id: 'aandelig-heis', name: 'Den åndelige heisen', mood: 'Åndelig, nostalgisk',
    steps: [S(8,'maj7','bVImaj7'), S(5,'m9','ivm9'), S(0,'','I')] },
  { id: 'overraskeren', name: 'Overraskeren', mood: 'Overrasket, mystisk',
    steps: [S(0,'','I'), S(7,'','V'), S(5,'m','iv'), S(8,'','bVI')] },
  { id: 'frygisk-kadens', name: 'Frygisk kadens', mood: 'Kadens',
    steps: [S(5,'m','iv'), S(3,'','bIII'), S(1,'','bII'), S(0,'','I')] },
  { id: 'backdoor', name: 'Backdoor-kadensen', mood: 'Kadens',
    steps: [S(10,'','bVII'), S(7,'7','V7'), S(0,'','I')] },
  { id: 'moll-plagal-heis', name: 'Moll-plagal-heisen', mood: 'Kadens',
    steps: [S(5,'m','iv'), S(3,'','bIII'), S(8,'','bVI'), S(0,'','I')] },
  { id: 'mystisk-vandring', name: 'Mystisk vandring', mood: 'Mystisk, nostalgisk',
    steps: [S(0,'','I'), S(8,'','bVI'), S(5,'','IV'), S(3,'','bIII'), S(10,'','bVII')] },
  { id: 'frygisk-lomme', name: 'Frygisk lomme', mood: 'Mystisk, nostalgisk',
    steps: [S(0,'m','i'), S(5,'m9','ivm9'), S(1,'','bII'), S(0,'m','i')] },
]

export const PROGRESSION_BY_ID: ReadonlyMap<string, CuratedProgression> = new Map(
  CURATED_PROGRESSIONS.map((p) => [p.id, p]),
)
