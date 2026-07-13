// Curated learning paths — ordered courses through existing licks. Client-only
// data (no DB); the library renders them and the practice view steps through
// them via ?path=<id>&i=<n> (same nav as user practice lists). PLAN Fase 2.

export interface CuratedPath {
  id: string
  name: string
  description: string
  slugs: string[]
}

export const CURATED_PATHS: CuratedPath[] = [
  {
    id: 'p_beginner',
    name: 'Nybegynner på tvers',
    description: 'En mild start med enkle licks fra flere sjangere — bli kjent med klaviaturet, tempo og transponering.',
    slugs: ['gospel-walk-up', 'worship-1-5-6-4-g', 'country-1-4-5-g', 'jazz-2-5-1-beginner-c', 'blues-slow-12-line-a', 'cinematic-pad-d'],
  },
  {
    id: 'p_gospel',
    name: 'Gospel-grunnkurs',
    description: 'Byggeklossene i gospelpiano: walk-up, turnaround, amen-avslutning og gjennomgangsakkorder.',
    slugs: ['gospel-walk-up', 'turnaround-1-6-2-5', 'amen-ending', 'ending-6-2-5-1', 'gospel-modern-praise-c', 'gospel-passing-chords'],
  },
  {
    id: 'p_jazz251',
    name: 'Jazz 2-5-1-mestring',
    description: 'Fra enkel ii–V–I til bebop-linjer og altererte turnarounds — kjernen i jazzharmonikk.',
    slugs: ['jazz-2-5-1-beginner-c', 'two-five-one-run', 'jazz-ii-v-i-bebop', 'jazz-1235-pattern', 'two-five-one-minor', 'jazz-turnaround-1625-eb'],
  },
  {
    id: 'p_blues',
    name: 'Blues fra grunnen',
    description: 'Bygg en blues-følelse: sakte linjer, blues-skala, turnaround og shuffle-komp.',
    slugs: ['blues-slow-12-line-a', 'blues-scale-lick-a', 'blues-turnaround-e', 'blues-boogie-shuffle-g', 'blues-fast-run-c'],
  },
  {
    id: 'p_neosoul',
    name: 'Neo-soul voicings',
    description: 'Frodige akkorder og glidende linjer — vamper, ballade-komp og neo-soul-løp.',
    slugs: ['neosoul-ballad-c', 'neosoul-vamp-eb', 'neosoul-quartal-vamp-f', 'neosoul-groove-bb', 'neosoul-run-eb'],
  },
  {
    id: 'p_lefthand',
    name: 'Venstrehånd-teknikk',
    description: 'Selvstendig venstrehånd: boogie-bass og stride, fra intro til full blues-groove.',
    slugs: ['boogie-intro-c', 'boogie-bassline-c', 'stride-cmajor', 'boogie-blues-c', 'stride-blues-f'],
  },
  {
    id: 'p_worship',
    name: 'Lovsang-verktøykasse',
    description: 'Alt du trenger for å akkompagnere en lovsang: intro, firegrep, pop-worship, fill og avslutning.',
    slugs: ['worship-pad-intro-c', 'worship-1-5-6-4-g', 'ccm-pop-worship-c', 'worship-fill-descending-a', 'worship-groove-d', 'amen-ending'],
  },
  {
    id: 'p_latin',
    name: 'Latin-groove',
    description: 'Fra rolig bolero og bossa til montuno, samba og cha-cha — hold claven, la det svinge.',
    slugs: ['latin-bolero-g', 'latin-bossa-am', 'latin-montuno-c', 'latin-samba-c', 'latin-chacha-a'],
  },
  {
    id: 'p_reels',
    name: 'Reels-vokabularet',
    description:
      'Lyden fra feeden din — neo-soul-lommer, golden hour, gospel-runs og looper i reels-format. Korte, lærbare og umiddelbart brukbare.',
    slugs: ['reels-neosoul-am9-loop', 'reels-run-fra-nonen-c', 'reels-goldenhour-arp-c', 'reels-gm9-fill', 'reels-biii-loop-g', 'reels-ending-iv-m6-eb', 'reels-dobbel-run-f'],
  },
]
