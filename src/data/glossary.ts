// Oppslagsverk — selvforfattet norsk musikkordliste for hele appen. Klient-only
// data (no DB), samme mønster som curated-paths.ts. To konsumenter:
//   1) <Term>/<GlossaryText> viser `short` i en liten popover ved klikk på
//      fagord i løpende tekst (auto-lenket via lib/glossary-match.ts).
//   2) /oppslagsverk viser `body` (lengre pedagogisk forklaring) med søk,
//      kategoriseksjoner og anker-dyplenking (#<id>).
//
// Skrivestil: for en norsk kirkemusiker uten jazz-/teoribakgrunn. `short` er
// 1–2 setninger (≤ ~220 tegn); `body` er 2–4 korte avsnitt ('\n\n' skiller),
// gjerne med konkret eksempel i C-dur.
//
// `aliases` er bøyninger/synonymer auto-lenkeren matcher i tillegg til `term`.
// `noAutoLink: true` = ordet er en homograf/hverdagsord (run, fill, overganger)
// eller vises overalt som etikett — det får oppføring på siden, men blir aldri
// auto-lenket i løpende tekst.

export type GlossaryCategory = 'harmoni' | 'rytme' | 'sjanger' | 'teknikk' | 'notasjon' | 'app'

export const GLOSSARY_CATEGORY_LABEL: Record<GlossaryCategory, string> = {
  harmoni: 'Harmoni og akkorder',
  rytme: 'Rytme og timing',
  sjanger: 'Sjangere og stiler',
  teknikk: 'Teknikk og spillemåter',
  notasjon: 'Notasjon og teori',
  app: 'Begreper i appen',
}

export const GLOSSARY_CATEGORY_ORDER: GlossaryCategory[] = [
  'harmoni',
  'rytme',
  'sjanger',
  'teknikk',
  'notasjon',
  'app',
]

export interface GlossaryTerm {
  /** kebab-case anker-id, brukes i /oppslagsverk#<id> */
  id: string
  /** Visningsform, f.eks. 'Voicing' */
  term: string
  /** Bøyninger/synonymer auto-lenkeren også matcher */
  aliases?: string[]
  category: GlossaryCategory
  /** 1–2 setninger til popoveren */
  short: string
  /** Lengre pedagogisk forklaring til /oppslagsverk. '\n\n' = nytt avsnitt. */
  body: string
  /** Id-er til beslektede oppføringer */
  seeAlso?: string[]
  /** true = aldri auto-lenk (homograf-/hverdagsord); vises kun på siden */
  noAutoLink?: boolean
}

export const GLOSSARY: GlossaryTerm[] = [
  // ───────────────────────── Harmoni og akkorder ─────────────────────────
  {
    id: 'voicing',
    term: 'Voicing',
    aliases: ['voicinger', 'voicingen', 'voicingene', 'voicings'],
    category: 'harmoni',
    short:
      'Måten tonene i en akkord er fordelt på — hvilke toner du tar med, i hvilken rekkefølge og i hvilket leie. Samme akkord kan klinge helt forskjellig med ulike voicinger.',
    body: 'En akkord (f.eks. Cmaj7) forteller bare HVILKE toner som inngår: C, E, G og H. En voicing er HVORDAN du legger dem på tangentene: tett samlet rundt midten, spredt over to hender, med eller uten grunntonen, kanskje med en tone doblet i oktav.\n\nPrøv selv: spill C–E–G–H tett i høyre hånd, og deretter C alene i venstre med E–G–H høyt i høyre. Samme akkord — to helt ulike stemninger. Det er derfor to pianister kan spille «de samme akkordene» og likevel låte helt forskjellig.\n\nI appen møter du navngitte voicing-stiler som shell, rotløs, drop-2, kvartal og gospel-spread — hver med sin egen klang og bruksområde.',
    seeAlso: ['shell-voicing', 'rootless-voicing', 'drop-2', 'kvartal-voicing', 'akkordtoner'],
  },
  {
    id: 'shell-voicing',
    term: 'Shell-voicing',
    aliases: ['shell', 'shell-voicinger'],
    category: 'harmoni',
    short:
      'Den enkleste jazz-voicingen: bare grunntone, ters og septim — «skallet» av akkorden. Lett å spille, og gir likevel hele akkordfargen.',
    body: 'Shell betyr «skall»: du spiller bare de tonene som definerer akkorden — grunntonen, tersen og septimen. Kvinten hoppes over fordi den sjelden tilfører farge.\n\nFor Cmaj7 blir det C–E–H. For C7 blir det C–E–B (b-septim). Tre toner, men øret hører hele akkorden.\n\nShell-voicinger er perfekte som første steg inn i jazzharmonikk: de er lette å flytte mellom akkorder, og de lar melodi eller høyre hånd få plass over.',
    seeAlso: ['voicing', 'rootless-voicing'],
  },
  {
    id: 'rootless-voicing',
    term: 'Rotløs voicing (rootless)',
    aliases: ['rootless', 'rotløs voicing', 'rotløs a', 'rotløs b', 'rotløse voicinger'],
    category: 'harmoni',
    short:
      'Voicing uten grunntonen — du lar bassisten (eller venstrehånden) ta roten, og spiller i stedet fargetonene: ters, septim og gjerne 9-eren.',
    body: 'Når du spiller med band tar bassisten grunntonen. Da trenger ikke pianoet dobling — i stedet kan du bruke fingrene på tonene som gir farge: ters, kvint, septim og utvidelser som 9 og 13.\n\nFor Cmaj7 kan en rotløs voicing være E–G–H–D (ters, kvint, septim, 9). Ingen C i det hele tatt — men over en C i bassen klinger det rikt og «jazzete».\n\n«Rotløs A» og «rotløs B» i appen er to standard-måter å stable de samme tonene på, slik at du kan bytte akkord med minst mulig håndbevegelse.',
    seeAlso: ['voicing', 'shell-voicing'],
  },
  {
    id: 'drop-2',
    term: 'Drop-2',
    aliases: ['drop 2', 'drop-2-voicing'],
    category: 'harmoni',
    short:
      'En voicing der den nest øverste tonen i en tett akkord «slippes ned» en oktav. Gir en åpnere, varmere klang som er lett å fordele på to hender.',
    body: 'Start med en tett firklang, f.eks. Cmaj7 som C–E–G–H med H øverst. Den nest øverste tonen er G. «Dropp» den en oktav ned, og du får G (lavt)–C–E–H.\n\nResultatet er en åpnere klang der tonene ikke ligger klemt sammen. Drop-2 brukes mye i jazz og gospel når man vil ha fyldige akkorder som likevel puster.\n\nEt praktisk triks: legg den droppede tonen i venstre hånd og resten i høyre — da faller voicingen naturlig på plass.',
    seeAlso: ['voicing', 'kvartal-voicing'],
  },
  {
    id: 'kvartal-voicing',
    term: 'Kvartal-voicing',
    aliases: ['kvartal', 'kvartvoicing', 'kvartale voicinger'],
    category: 'harmoni',
    short:
      'Akkord bygget av kvarter (4 trinn mellom hver tone) i stedet for terser. Gir en åpen, svevende, moderne klang — mye brukt i neo-soul og moderne gospel.',
    body: 'Vanlige akkorder stables i terser: C–E–G. En kvartal-voicing stabler i kvarter i stedet: f.eks. D–G–C eller E–A–D.\n\nFordi ingen ters definerer dur eller moll, låter kvartale voicinger åpne og litt «uavklarte» — på en god måte. De glir lett mellom akkorder og gir umiddelbart en moderne farge.\n\nPrøv: spill D–G–C i høyre hånd over en C i bassen. Det er en Csus-aktig klang som fungerer nesten overalt i en lovsang.',
    seeAlso: ['voicing', 'sus-akkord'],
  },
  {
    id: 'akkordtoner',
    term: 'Akkordtoner',
    aliases: ['akkordtone', 'akkordens toner'],
    category: 'harmoni',
    short:
      'Tonene som inngår i akkorden som klinger akkurat nå. Melodilinjer som lander på akkordtoner låter «riktige»; toner utenfor skaper spenning.',
    body: 'Hver akkord består av bestemte toner: C-dur har C, E og G; Cmaj7 har i tillegg H. Dette er akkordtonene.\n\nNår du improviserer eller spiller en lick, er akkordtonene trygg grunn: lander du på en av dem på et tungt slag, låter det forankret. Tonene mellom (gjennomgangstoner) skaper bevegelse og spenning på veien.\n\nI øvingsvisningen kan du slå på «Akkordtoner»-overlegget — da lyser akkordens toner opp på klaviaturet mens licken spilles, synkront med akkordskjemaet.',
    seeAlso: ['voicing', 'skala', 'akkordskjema'],
  },
  {
    id: 'diatonisk',
    term: 'Diatonisk',
    aliases: ['diatoniske', 'diatonisk grad'],
    category: 'harmoni',
    short:
      'Innenfor tonearten — bygget kun av skalaens egne toner. I C-dur er C, Dm, Em, F, G og Am de diatoniske akkordene.',
    body: 'Diatonisk betyr rett og slett «hører hjemme i tonearten». I C-dur er de hvite tangentene skalaens toner, og akkordene du kan bygge av dem (C, Dm, Em, F, G, Am, Hdim) er de diatoniske akkordene.\n\nDet meste av en lovsang er diatonisk — det er derfor den låter «hjemme». Krydderet kommer når man låner toner eller akkorder utenfra: det kalles kromatikk eller alterasjoner.\n\nI Spill smartere-modusen betyr «diatonisk grad» hvilket trinn i skalaen en akkord står på — f.eks. er F den 4. graden (IV) i C-dur.',
    seeAlso: ['kromatisk', 'skalatrinn', 'toneart'],
  },
  {
    id: 'kromatisk',
    term: 'Kromatisk',
    aliases: ['kromatiske', 'kromatikk'],
    category: 'harmoni',
    short:
      'Bruker toner utenfor tonearten, ofte i halvtonetrinn. En kromatisk gående bass eller en kromatisk gjennomgangstone gir farge og driv.',
    body: 'Kromatisk er det motsatte av diatonisk: toner som IKKE hører til skalaen. På pianoet betyr det ofte de svarte tangentene når du spiller i C-dur.\n\nKromatikk brukes mest som «lim» mellom skalaens toner: en bass som går C–C#–D binder akkordene sammen med et halvtonetrinn som ikke finnes i skalaen. Det låter målrettet, ikke feil — fordi den kromatiske tonen leder rett inn i neste.\n\nGospel og jazz er fulle av kromatiske gjennomgangstoner og -akkorder. Lytt etter dem i walk-ups og turnarounds i biblioteket.',
    seeAlso: ['diatonisk', 'gjennomgangsakkord', 'gaende-bass'],
  },
  {
    id: 'ii-v-i',
    term: 'ii–V–I',
    aliases: ['2-5-1', 'ii-v-i', '2–5–1', 'to-fem-en'],
    category: 'harmoni',
    short:
      'Jazzens vanligste akkordrekke: akkorden på 2. trinn, så 5., så 1. I C-dur: Dm7–G7–Cmaj7. Den låter som en trygg «hjemreise» til tonearten.',
    body: 'Tallene viser skalatrinnene akkordene bygges på. I C-dur er 2. trinn D, 5. trinn G og 1. trinn C — altså Dm7 → G7 → Cmaj7.\n\nRekken fungerer fordi hver akkord leder naturlig til neste: Dm7 forbereder, G7 skaper spenning (dominanten), og Cmaj7 er hjemkomsten. Øret kjenner igjen denne reisen selv uten å vite teorien.\n\nLærer du deg ii–V–I i alle tolv tonearter, har du nøkkelen til enormt mye jazz, gospel og soul. Kurset «Jazz 2-5-1-mestring» tar deg gjennom det steg for steg.',
    seeAlso: ['dominant', 'kadens', 'turnaround', 'skalatrinn'],
  },
  {
    id: 'turnaround',
    term: 'Turnaround',
    aliases: ['turnarounds', 'turnarounden', '1-6-2-5'],
    category: 'harmoni',
    short:
      'En kort akkordrekke på slutten av en runde som «snur» musikken tilbake til starten — ofte I–vi–ii–V (i C: C–Am–Dm–G).',
    body: 'Når et vers eller en runde er ferdig og skal spilles igjen, trenger musikken en sving tilbake til start. Det er turnaroundens jobb: en liten akkordrekke som ender på dominanten (V), slik at neste runde kan lande på I igjen.\n\nDen vanligste er I–vi–ii–V: i C-dur C–Am–Dm–G7. Hver akkord leder til neste, og G7 peker rett hjem til C.\n\nI gospel og jazz pyntes turnarounds gjerne med kromatikk og altererte akkorder — søk på «turnaround» i biblioteket for å høre varianter fra enkle til avanserte.',
    seeAlso: ['ii-v-i', 'kadens', 'alterert'],
  },
  {
    id: 'reharmonisering',
    term: 'Reharmonisering',
    aliases: ['reharm', 'reharmonisere', 'reharmoniseringer', 'reharm-forslag'],
    category: 'harmoni',
    short:
      'Å bytte ut akkordene under en melodi med nye som farger den annerledes — melodien er den samme, men landskapet under endres.',
    body: 'En melodi kan bæres av mange ulike akkorder. Reharmonisering er kunsten å velge andre akkorder enn de opprinnelige — for å gjøre en kjent sang rikere, mer overraskende eller mer personlig.\n\nEnkelt eksempel i C-dur: der det står C, kan du ofte spille Am7 eller Fmaj7/C i stedet — melodien passer fortsatt, men fargen blir varmere. Mer avansert: bytt G7 med Db7 (tritonussubstitusjon).\n\nI Spill smartere → Krydre foreslår appen reharmoniseringer for akkorden du velger, i din toneart. Prøv dem i rekkefølge og hør hvordan fargen endres.',
    seeAlso: ['tritonussubstitusjon', 'alterert', 'voicing'],
  },
  {
    id: 'modulasjon',
    term: 'Modulasjon',
    aliases: ['modulasjoner', 'modulere', 'modulér', 'toneartsskifte'],
    category: 'harmoni',
    short:
      'Å skifte toneart midt i musikken — for eksempel løfte siste refreng fra C-dur til D-dur. Gir energi og «nytt gir».',
    body: 'En modulasjon flytter hele musikken til en ny toneart. Det klassiske eksempelet er lovsangen som løfter siste refreng ett trinn opp — plutselig føles alt friskere.\n\nKunsten ligger i overgangen: hopper du rett, blir det brått. Bruker du en bro-akkord — for eksempel dominanten til den nye tonearten (A7 før D-dur) — leder du øret dit du skal.\n\nI Spill smartere → Overganger velger du fra- og til-toneart på kvintsirkelen, og appen genererer tre rangerte forslag til hvordan du kan modulere — med pivotakkord, ii–V eller sekundærdominant.',
    seeAlso: ['pivotakkord', 'sekundaerdominant', 'kvintsirkel', 'toneart'],
  },
  {
    id: 'pivotakkord',
    term: 'Pivotakkord',
    aliases: ['pivotakkorden', 'pivotakkord-modulasjon', 'pivot'],
    category: 'harmoni',
    short:
      'En akkord som finnes i både gammel og ny toneart, og derfor kan brukes som «dør» mellom dem når du modulerer.',
    body: 'Skal du fra C-dur til G-dur, finnes det akkorder begge toneartene har felles — f.eks. Am (vi i C, ii i G) og Em (iii i C, vi i G). En slik felles akkord kalles pivotakkord («dreiepunkt»).\n\nOppskriften: spill pivotakkorden mens øret fortsatt tror du er i gammel toneart, og fortsett så som om den tilhørte den nye. Overgangen blir sømløs fordi ingen enkeltakkord låter fremmed.\n\nDette er den mykeste måten å modulere på — appens overgangsgenerator merker disse forslagene «Pivotakkord-modulasjon».',
    seeAlso: ['modulasjon', 'sekundaerdominant'],
  },
  {
    id: 'sekundaerdominant',
    term: 'Sekundærdominant',
    aliases: ['sekundærdominanter', 'sekundærdominant-modulasjon', 'v7/v'],
    category: 'harmoni',
    short:
      'En «lånt» dominant som peker mot en annen akkord enn tonika — f.eks. D7 (V av G) brukt i C-dur for å lede ekstra sterkt til G.',
    body: 'Hver akkord kan få sin egen dominant. I C-dur er G7 dominanten som leder hjem til C — men du kan også låne D7, som er dominanten TIL G. Da leder D7 → G7 → C med dobbel kraft. D7 kalles da en sekundærdominant og skrives ofte V7/V («fem av fem»).\n\nDette er en av gospelens favoritt-teknikker: små dominant-kjeder som drar musikken fremover akkord for akkord.\n\nHør etter den i turnarounds — f.eks. C–A7–Dm–G7, der A7 (V av Dm) er sekundærdominanten som gir rekka det ekstra draget.',
    seeAlso: ['dominant', 'modulasjon', 'turnaround'],
  },
  {
    id: 'tritonussubstitusjon',
    term: 'Tritonussubstitusjon',
    aliases: ['tritonus-sub', 'tritonussub', 'tritonus'],
    category: 'harmoni',
    short:
      'Å bytte en dominant med dominanten en tritonus (tre hele toner) unna — G7 blir Db7. Bassen får kromatisk fall, og klangen blir røykfylt jazz.',
    body: 'G7 og Db7 deler de to viktigste tonene sine (H og F — tonene som skaper dominantspenningen). Derfor kan de byttes om: der det står G7 → C, kan du spille Db7 → C i stedet.\n\nGevinsten er bassen: i stedet for spranget G → C får du det silkemyke halvtonefallet Db → C. Det er en av de mest gjenkjennelige jazz-lydene som finnes.\n\nPrøv i en ii–V–I: Dm7–Db7–Cmaj7 i stedet for Dm7–G7–Cmaj7. Samme reise, mye røykfullere landskap.',
    seeAlso: ['reharmonisering', 'dominant', 'ii-v-i'],
  },
  {
    id: 'gjennomgangsakkord',
    term: 'Gjennomgangsakkord',
    aliases: ['gjennomgangsakkorder', 'gjennomgangstone', 'gjennomgangstoner'],
    category: 'harmoni',
    short:
      'En kort akkord (eller tone) som binder sammen to hovedakkorder — den passeres på veien og gir bevegelse uten å endre retningen.',
    body: 'Mellom to akkorder som ligger et stykke fra hverandre kan du legge inn en akkord «på gjennomreise». Fra C til Em kan du f.eks. passere C/D eller Ddim — bassen går da C–D–E i pen trapp.\n\nGjennomgangsakkorden får lite tid (ofte et halvt slag) og trenger ikke være pen på egen hånd — jobben dens er å lede. Det samme gjelder gjennomgangstoner i en melodilinje.\n\nGospelpiano lever av dette: walk-ups og walk-downs er i praksis kjeder av gjennomgangsakkorder. Kurset «Gospel-grunnkurs» viser teknikken i praksis.',
    seeAlso: ['walk-up', 'kromatisk', 'gaende-bass'],
  },
  {
    id: 'alterert',
    term: 'Alterert akkord',
    aliases: ['altererte', 'alterert', 'alterasjoner', 'alterasjon'],
    category: 'harmoni',
    short:
      'En dominant der 5-eren og/eller 9-eren er hevet eller senket (b9, #9, b5, #5) for maksimal spenning før oppløsningen.',
    body: 'Å alterere betyr å endre: du tar en vanlig dominantakkord og flytter noen av tilleggstonene en halvtone opp eller ned. G7 kan bli G7(b9), G7(#5), G7alt — alle med mer «knirk» og spenning enn ren G7.\n\nPoenget er kontrast: jo mer spenning dominanten bygger, desto deiligere blir landingen på I. Det er som å strekke strikken lenger før du slipper.\n\nAltererte dominanter hører hjemme i jazz og moden gospel. Begynn med b9: spill G7 med Ab på toppen, og land på C — hør hvor mye sterkere hjemkomsten blir.',
    seeAlso: ['dominant', 'turnaround', 'reharmonisering'],
  },
  {
    id: 'sus-akkord',
    term: 'Sus-akkord',
    aliases: ['sus2', 'sus4', 'sus-akkorder', 'sus'],
    category: 'harmoni',
    short:
      'Akkord der tersen er byttet ut med sekund (sus2) eller kvart (sus4). Uten ters er den verken dur eller moll — åpen og svevende.',
    body: '«Sus» er kort for suspended — tersen er «hengt opp» og erstattet: Csus4 = C–F–G, Csus2 = C–D–G.\n\nUten tersen mister akkorden dur/moll-identiteten og får en åpen, forventningsfull klang. Klassisk bruk: Gsus4 → G7 → C, der sus-akkorden utsetter spenningen et øyeblikk før den løses opp.\n\nModerne lovsang bruker sus-akkorder overalt, ofte uten å løse dem opp i det hele tatt — den åpne klangen ER poenget. Kvartale voicinger er nære slektninger.',
    seeAlso: ['kvartal-voicing', 'dominant'],
  },
  {
    id: 'akkordsymboler',
    term: 'Akkordsymboler (maj7, m7, 7, dim)',
    category: 'harmoni',
    noAutoLink: true,
    short:
      'Kortskriften over notelinjene: Cmaj7 = C-dur med stor septim, Cm7 = c-moll med liten septim, C7 = dominantseptim, Cdim = forminsket.',
    body: 'Akkordsymboler er en kompakt oppskrift. Bokstaven er grunntonen; resten beskriver fargen:\n\nC = ren dur (C–E–G). Cm = moll (C–Eb–G). C7 = dur + liten septim (C–E–G–B) — «dominantseptim», akkorden som vil videre. Cmaj7 = dur + stor septim (C–E–G–H) — myk og rund. Cm7 = moll + liten septim. Cdim = forminsket (C–Eb–Gb). C/E = C-dur med E i bassen («skråstrek-akkord»).\n\nTall over 7 (9, 11, 13) er utvidelser — ekstra fargetoner stablet videre i terser. Du trenger ikke alle på en gang: spill grunntone, ters og septim, så har du kjernen av ethvert symbol.',
    seeAlso: ['voicing', 'akkordtoner', 'dominant'],
  },
  {
    id: 'kvintsirkel',
    term: 'Kvintsirkel',
    aliases: ['kvintsirkelen', 'circle of fifths'],
    category: 'harmoni',
    short:
      'Alle tolv toneartene ordnet i en sirkel der naboene er en kvint fra hverandre. Nabo-tonearter deler flest toner og er lettest å bevege seg mellom.',
    body: 'Start på C øverst og gå med klokka i kvinter: C → G → D → A … Etter tolv steg er du hjemme igjen. Det er kvintsirkelen.\n\nDen er nyttig fordi avstand i sirkelen = slektskap: C-dur og G-dur (naboer) deler seks av sju toner, mens C-dur og F#-dur (tvers over) nesten ikke deler noe. Skal du modulere, er korte hopp i sirkelen myke og lange hopp dramatiske.\n\nI Spill smartere → Overganger ER kvintsirkelen selve grensesnittet: trykk på fra- og til-toneart, og appen foreslår veier mellom dem.',
    seeAlso: ['modulasjon', 'toneart', 'ii-v-i'],
  },
  {
    id: 'funksjonsharmonikk',
    term: 'Funksjonsharmonikk',
    aliases: ['funksjonsharmonisk', 'akkordfunksjon', 'akkordfunksjoner'],
    category: 'harmoni',
    short:
      'Idéen om at akkorder har roller: tonika (hjem), subdominant (på vei ut) og dominant (spenning som vil hjem). Rollene forklarer hvorfor akkordrekker «funker».',
    body: 'I stedet for å pugge akkordrekker kan du tenke roller. Tonika (I) er hjemme og i ro. Subdominanten (IV) beveger seg bort hjemmefra. Dominanten (V) bygger spenning som vil tilbake til tonika.\n\nI C-dur: C er hjem, F er utfarten, G7 er lengselen hjem. Nesten alle salmer og lovsanger kan leses som runder av hjem → ut → spenning → hjem.\n\nNår du kjenner rollene, kan du bytte akkorder med samme funksjon (Am kan ofte gjøre tonika-jobben til C) — det er grunnlaget for all reharmonisering.',
    seeAlso: ['tonika', 'subdominant', 'dominant', 'reharmonisering'],
  },
  {
    id: 'tonika',
    term: 'Tonika',
    aliases: ['tonikaen'],
    category: 'harmoni',
    short:
      'Toneartens hjem-akkord — akkorden på 1. trinn (C i C-dur). Musikk føles «ferdig» når den lander på tonika.',
    body: 'Tonika er tyngdepunktet alt annet forholder seg til. I C-dur er det C-akkorden; i G-dur er det G.\n\nAlt som skjer harmonisk kan beskrives som avstand fra tonika: musikken drar ut (subdominant), bygger lengsel (dominant) og kommer hjem (tonika). Derfor slutter de aller fleste sanger på tonika — noe annet føles uforløst.\n\nRomertallet for tonika er I (stor for dur, liten i for moll).',
    seeAlso: ['funksjonsharmonikk', 'dominant', 'subdominant', 'toneart'],
  },
  {
    id: 'subdominant',
    term: 'Subdominant',
    aliases: ['subdominanten'],
    category: 'harmoni',
    short:
      'Akkorden på 4. trinn (F i C-dur) — «utfarten» hjemmefra. Mykere enn dominanten, mye brukt i amen-kadensen.',
    body: 'Subdominanten er akkorden på skalaens 4. trinn: F i C-dur. Funksjonen dens er bevegelse bort fra hjemmet — uten den skarpe spenningen dominanten har.\n\nIV → I (F → C) er den myke «amen»-hjemkomsten som avslutter utallige salmer, og IV er også hjørnesteinen i pop- og lovsangsrekker som I–V–vi–IV.\n\nRomertallet er IV.',
    seeAlso: ['funksjonsharmonikk', 'tonika', 'amen-kadens'],
  },
  {
    id: 'dominant',
    term: 'Dominant',
    aliases: ['dominanten', 'dominantseptim', 'dominantakkord'],
    category: 'harmoni',
    short:
      'Akkorden på 5. trinn (G eller G7 i C-dur) — spenningen som vil hjem til tonika. Motoren i nesten all vestlig harmonikk.',
    body: 'Dominanten står på skalaens 5. trinn og inneholder skalaens mest «rastløse» toner. Med septim (G7 i C-dur) får den i tillegg tritonus-intervallet mellom H og F — selve lyden av «noe må skje».\n\nV → I (G7 → C) er musikkens sterkeste hjemkomst og kjernen i kadenser, turnarounds og ii–V–I.\n\nNesten alt harmonisk krydder er varianter av dominanten: sekundærdominanter, altererte dominanter og tritonussubstitusjoner er alle måter å forsterke eller forkle den samme lengselen hjem.',
    seeAlso: ['tonika', 'ii-v-i', 'sekundaerdominant', 'alterert', 'kadens'],
  },
  {
    id: 'vamp',
    term: 'Vamp',
    aliases: ['vamper', 'vampe', 'vampen'],
    category: 'harmoni',
    short:
      'En kort akkordrekke (ofte 1–2 takter) som gjentas om og om igjen — grunnmuren under frie partier, lovprisning og soloer.',
    body: 'En vamp er musikkens tomgang på sitt beste: to–fire akkorder i løkke, f.eks. Cmaj7 → Fmaj7 eller Am7 → D9. Fordi rekka gjentas, kan alt annet — sang, bønn, improvisasjon — bevege seg fritt oppå.\n\nI gospel og lovsang brukes vamper til å holde et parti åpent så lenge det trengs: «vi blir her til det er tid for å gå videre».\n\nNeo-soul-kategorien i biblioteket er full av vamper — søk på «vamp» og prøv å legge egne fills oppå mens løkka går.',
    seeAlso: ['groove', 'fill', 'komp'],
  },
  {
    id: 'walk-up',
    term: 'Walk-up',
    aliases: ['walk-ups', 'walkup', 'walk up', 'walk-down', 'walkdown'],
    category: 'harmoni',
    short:
      'En trappevis vandring i bassen opp (eller ned: walk-down) mot neste akkord — gospelens klassiske måte å binde akkorder sammen på.',
    body: 'I stedet for å hoppe rett fra C til F, går du trappa: bassen spiller C–D–E og lander på F. Det er en walk-up. Motsatt vei (walk-down) fungerer like godt.\n\nTrinnene kan være diatoniske (skalaens egne toner) eller kromatiske (med halvtonetrinn i mellom), og hvert trinn kan harmoniseres med sin egen lille akkord.\n\nDette er noe av det første en gospelpianist lærer — appens aller første lick, «gospel-walk-up», viser grunnformen.',
    seeAlso: ['gaende-bass', 'gjennomgangsakkord', 'kromatisk'],
  },
  {
    id: 'kadens',
    term: 'Kadens',
    aliases: ['kadenser', 'kadensen'],
    category: 'harmoni',
    short:
      'En akkordvending som avslutter en frase — musikkens tegnsetting. V–I er punktum, IV–I er «amen», V uten oppløsning er komma.',
    body: 'Kadenser er måtene musikk «lander» på. De vanligste: Autentisk kadens (V → I, f.eks. G7 → C) er det tydelige punktumet. Plagal kadens (IV → I, F → C) er den mykere «amen»-avslutningen. Halvkadens (ender på V) er kommaet som sier «mer kommer».\n\nNår du hører at et vers er «ferdig», er det kadensen du hører. Og når en lovsangsleder vil holde rommet åpent, unngår hen punktum-kadensen med vilje.\n\nAvslutnings-licksene i biblioteket (kategorien «Avslutning») er i praksis utsmykkede kadenser.',
    seeAlso: ['dominant', 'amen-kadens', 'turnaround'],
  },
  {
    id: 'amen-kadens',
    term: 'Amen-kadens (plagal)',
    aliases: ['amen-avslutning', 'plagal kadens', 'amen-kadensen'],
    category: 'harmoni',
    short:
      'IV → I-avslutningen (F → C i C-dur) — klangen av «A-men» på slutten av salmer. Mykere og varmere enn den vanlige V → I.',
    body: 'Syng «A-men» slik det gjøres på slutten av en salme: den første stavelsen er subdominanten (IV), den andre er tonika (I). I C-dur: F → C.\n\nFordi den mangler dominantens skarpe ledetone, føles den plagale kadensen mild og høytidelig i stedet for triumferende. Det er kirkens signatur-avslutning.\n\nI gospel pyntes den gjerne: F kan bli Fm eller F/G på veien hjem, og hjemkomsten kan strekkes over flere takter. Licken «amen-ending» viser en klassisk variant.',
    seeAlso: ['kadens', 'subdominant'],
  },
  {
    id: 'firegrep',
    term: 'Firegrep',
    aliases: ['firegrepet', 'fire akkorder'],
    category: 'harmoni',
    short:
      'De fire akkordene som bærer mesteparten av moderne lovsang og pop: I, V, vi og IV — i C-dur: C, G, Am, F.',
    body: 'Utallige lovsanger og popsanger bruker de samme fire akkordene i en eller annen rekkefølge: I–V–vi–IV (C–G–Am–F i C-dur), eller rotasjoner som vi–IV–I–V.\n\nKan du disse fire i noen få tonearter — og kjenner du dem igjen på gehør — kan du akkompagnere en stor del av repertoaret uten noter.\n\nKurset «Lovsang-verktøykasse» bygger rundt nettopp dette grepet, med intro, komp, fill og avslutning.',
    seeAlso: ['funksjonsharmonikk', 'komp'],
  },

  // ───────────────────────── Rytme og timing ─────────────────────────
  {
    id: 'swing',
    term: 'Swing',
    aliases: ['swing-følelse', 'swingfølelse'],
    category: 'rytme',
    short:
      'Å spille åttedelene ujevnt — lang-kort, lang-kort — i stedet for rett. Det er selve «gyngen» i jazz, blues og mye gospel.',
    body: 'Skriv to like åttedeler på papiret; spill dem som «lang-kort» (omtrent som de to første tonene i en triol pluss den siste) — da swinger det. Spiller du dem matematisk likt, er det «straight».\n\nHvor mye du forskyver er en smakssak og varierer med tempo: sakte blues svinger tungt, hurtig bebop nesten rett.\n\nI øvingsvisningen kan du slå på Swing-bryteren — appen spiller da licken med swing-underdeling, så du hører forskjellen på rett og svingt med samme noter.',
    seeAlso: ['triol', 'shuffle', 'underdeling'],
  },
  {
    id: 'triol',
    term: 'Triol',
    aliases: ['trioler', 'triol-følelse', 'triolen'],
    category: 'rytme',
    short:
      'Tre toner jevnt fordelt på tiden der det normalt er to. Skrives med en «3» over notegruppen. Grunnlaget for shuffle- og swingfølelse.',
    body: 'Del ett taktslag i tre like deler i stedet for to — det er en triol. Tell «tri-o-la» på hvert slag, så kjenner du det i kroppen.\n\nTrioler gir en rullende, vuggende følelse. Hele shuffle- og swing-tradisjonen bygger på triol-underdeling: den «svingte» åttedelen er egentlig første og tredje del av en triol.\n\nI notasjonsvisningen ser du trioler som en klamme med tallet 3 over tre noter. Flere licks i blues- og gospel-kategoriene bruker dem — søk på «triol».',
    seeAlso: ['swing', 'shuffle', 'underdeling'],
  },
  {
    id: 'shuffle',
    term: 'Shuffle',
    aliases: ['shuffle-komp', 'shuffle-groove'],
    category: 'rytme',
    short:
      'En groove der alle åttedeler spilles med triolfølelse — blueskompets hjerteslag. Tenk «dum-da dum-da» i stedet for «dum-dum».',
    body: 'Shuffle er swing satt i system: hver eneste åttedel spilles lang-kort etter triolmønsteret, konsekvent gjennom hele låten. Resultatet er den umiskjennelige hinkende blues-grooven.\n\nPrøv: spill C-durakkord jevnt åtte ganger i takten — først helt likt (straight), så med lang-kort-følelse. Den andre versjonen er shuffle.\n\nBoogie- og blueslicksene i biblioteket er stort sett tenkt med shuffle-følelse; slå på Swing-bryteren i øvingsvisningen for å høre det riktig.',
    seeAlso: ['swing', 'triol', 'boogie-woogie'],
  },
  {
    id: 'groove',
    term: 'Groove',
    aliases: ['grooven', 'grooves'],
    category: 'rytme',
    short:
      'Det gjentakende rytmiske mønsteret som får musikken til å «sitte» — kombinasjonen av rytme, betoning og timing som gjør at det svinger.',
    body: 'Groove er vanskelig å definere men umulig å ta feil av: det er når rytmen låser seg og kroppen vil bevege seg. Teknisk er det et kort rytmisk mønster som gjentas med konsekvent betoning og timing.\n\nFor en pianist betyr groove ofte venstrehåndens faste mønster pluss høyrehåndens rytmiske plassering — og disiplinen til å holde det stabilt uten å ruse.\n\n«Groove» er også en egen kategori i biblioteket: mønstre som er ment å gå i løkke som fundament, ikke som melodiske utspill.',
    seeAlso: ['komp', 'vamp', 'backbeat', 'laid-back'],
  },
  {
    id: 'synkopering',
    term: 'Synkopering',
    aliases: ['synkopert', 'synkoper', 'synkope'],
    category: 'rytme',
    short:
      'Å betone slagene «mellom» de tunge — rytmen lander der du ikke venter det. Det som gjør gospel og latin så levende.',
    body: 'Vanlig puls betoner 1-2-3-4. Synkopering flytter trykket til og-ene i mellom («1-og-2-og») eller holder en tone over det tunge slaget, slik at aksenten kommer for «tidlig» eller «sent».\n\nØret venter tyngde på slaget; når den kommer et annet sted, oppstår friksjonen som gjør at det svinger. Uten synkoper: marsj. Med: gospel, funk, latin.\n\nLytt til montuno- og neo-soul-licksene i biblioteket — nesten ingenting lander rett på slaget, og det er nettopp derfor de lever.',
    seeAlso: ['groove', 'clave', 'backbeat'],
  },
  {
    id: 'clave',
    term: 'Clave',
    aliases: ['claven', '3-2-clave', '2-3-clave'],
    category: 'rytme',
    short:
      'Det faste to-takters nøkkelmønsteret all afro-cubansk musikk organiseres rundt (f.eks. 3+2-slag). Holder du claven, henger alt annet sammen.',
    body: 'Claven er et rytmisk «skjelett» på to takter — i son-clave: tre slag i første takt, to i andre (3-2), eller omvendt (2-3). Alle instrumentene i salsa, montuno og mye latinmusikk plasserer rytmene sine i forhold til dette mønsteret.\n\nDen spilles ofte på to trepinner (claves), men selv når ingen spiller den hørbart, «er» den der som felles referanse.\n\nNår du øver latin-licksene i biblioteket: klapp claven først, spill etterpå. Grooven faller på plass når mønsteret sitter i kroppen.',
    seeAlso: ['montuno', 'synkopering', 'groove'],
  },
  {
    id: 'metronom',
    term: 'Metronom',
    aliases: ['metronomen', 'tell-inn', 'telle-inn'],
    category: 'rytme',
    short:
      'Klikket som holder jevn puls mens du øver. Å øve med metronom er den sikreste veien til stabil timing — start sakte, øk gradvis.',
    body: 'Metronomen gir deg en ærlig puls å måle deg mot. Hjernen jukser gjerne — vi ruser i lette partier og bremser i vanskelige — og klikket avslører det umiddelbart.\n\nGod øverutine: sett tempoet så lavt at du klarer licken feilfritt, og øk med små steg (4–8 BPM) først når det sitter. Sakte og riktig slår fort og omtrentlig, hver gang.\n\nI øvingsvisningen kan du slå på metronom og tell-inn, og «Trapp opp»-funksjonen øker tempoet automatisk for hver runde du klarer.',
    seeAlso: ['bpm', 'underdeling'],
  },
  {
    id: 'bpm',
    term: 'BPM',
    aliases: ['beats per minute'],
    category: 'rytme',
    short:
      'Beats per minute — antall taktslag i minuttet. 60 BPM = ett slag i sekundet. Tallet du justerer med tempo-kontrollen i appen.',
    body: 'BPM måler tempo: 60 BPM er ett slag per sekund, 120 BPM er to. En rolig lovsangsballade ligger gjerne rundt 65–75 BPM, en gospel-shout kan passere 140.\n\nFordi alt i appen er lagret som noter (MIDI-data) og ikke lyd, kan du endre BPM fritt uten at klangen påvirkes — licken spilles bare fortere eller saktere, med samme lyd.\n\nAppen husker «beste BPM» per lick: det høyeste tempoet du har klart i øvemodus. Bruk det som personlig rekord å slå.',
    seeAlso: ['metronom', 'beste-bpm'],
  },
  {
    id: 'taktart',
    term: 'Taktart',
    aliases: ['taktarter', 'firetakt', '4/4', '3/4', '6/8'],
    category: 'rytme',
    short:
      'Hvordan pulsen grupperes: 4/4 har fire slag i takten (det vanligste), 3/4 har tre (vals), 6/8 to grupper på tre (gynge).',
    body: 'Taktarten skrives som en brøk: øverste tall er antall slag i takten, nederste hvilken noteverdi som teller som ett slag. 4/4 = fire fjerdedeler per takt.\n\nDe fleste lovsanger og gospellåter går i 4/4. 3/4 kjenner du fra valser og eldre salmer; 6/8 gir den rullende «gyngefølelsen» i mange soul- og gospelballader.\n\nLicksene i biblioteket er i 4/4 — men rytmefølelsen i dem varierer stort med underdelingen (rett, swing, triol).',
    seeAlso: ['underdeling', 'triol'],
  },
  {
    id: 'underdeling',
    term: 'Underdeling',
    aliases: ['underdelinger', 'åttedeler', 'sekstendeler', 'åttedel', 'sekstendel'],
    category: 'rytme',
    short:
      'Hvordan hvert taktslag deles opp i mindre enheter — i to (åttedeler), fire (sekstendeler) eller tre (trioler). Underdelingen bestemmer følelsen.',
    body: 'Pulsen er slagene; underdelingen er hva som skjer inni dem. Deler du slaget i to får du åttedeler («1-og-2-og»), i fire sekstendeler («1-e-og-a»), i tre trioler.\n\nSamme melodi får helt ulik karakter med ulik underdeling: rette åttedeler låter pop, trioler låter gospel-ballade, sekstendeler låter funk eller neo-soul.\n\nNår du lytter til en ny lick: finn først underdelingen (tell høyt!), så faller rytmen på plass mye fortere.',
    seeAlso: ['triol', 'swing', 'taktart'],
  },
  {
    id: 'backbeat',
    term: 'Backbeat',
    aliases: ['backbeaten'],
    category: 'rytme',
    short:
      'Trykket på slag 2 og 4 (der trommeslageren har skarptromma) — motoren i gospel, soul og all rytmisk kirkemusikk. Klapp på 2 og 4, aldri 1 og 3!',
    body: 'I klassisk musikk ligger tyngden på 1 og 3. I gospel, soul og rock flyttes den til 2 og 4 — det er backbeat. Det er dit menigheten (forhåpentligvis) klapper.\n\nFor pianister betyr det å kjenne 2 og 4 som ankerpunkter: komp-figurer og fills plasseres slik at de løfter backbeaten i stedet for å sloss mot den.\n\nØv med metronomen som «skarptromme»: sett den til halvt tempo og hør klikkene som 2 og 4. Det føles rart i starten — og forvandler timingen din.',
    seeAlso: ['groove', 'synkopering', 'komp'],
  },
  {
    id: 'laid-back',
    term: 'Laid-back timing',
    aliases: ['laid-back', 'laid back'],
    category: 'rytme',
    short:
      'Å spille bittelitt bak pulsen — med vilje. Gir den avslappede, tunge følelsen i soul, neo-soul og gospelballader.',
    body: 'Timing er ikke bare riktig/feil — den har farge. Spiller du hårfint etter klikket (uten å sakke), oppleves musikken rolig, tung og selvsikker. Det kalles laid-back.\n\nMotsatt gir det å ligge hårfint foran («on top») energi og driv. Store trommeslagere og pianister flytter seg bevisst rundt pulsen etter hva musikken trenger.\n\nØv slik: la metronomen gå, og prøv å legge anslagene dine akkurat i bakkant av klikket uten at avstanden vokser. Neo-soul-licksene i biblioteket er perfekte til dette.',
    seeAlso: ['groove', 'neo-soul'],
  },

  // ───────────────────────── Sjangere og stiler ─────────────────────────
  {
    id: 'gospel',
    term: 'Gospel',
    aliases: ['gospelpiano', 'gospelmusikk'],
    category: 'sjanger',
    short:
      'Amerikansk kirkemusikk med røtter i spirituals og blues — rik harmonikk, sterk rytme og call-and-response. Pianoet er selve motoren i lyden.',
    body: 'Gospel vokste fram i afroamerikanske kirker og forener blues-språket med kirkens tekster og fellessang. Kjennetegn: walk-ups, rike septim- og gjennomgangsakkorder, shuffle- og triolfølelse, og et piano som både komper, svarer forsangeren og driver menigheten.\n\nModerne gospel (fra 90-tallet og ut) har tatt opp jazz- og R&B-harmonikk — altererte dominanter, rotløse voicinger — og er blitt et av de mest harmonisk avanserte feltene i populærmusikken.\n\nGospel er appens største kategori. Start med kurset «Gospel-grunnkurs» for byggeklossene.',
    seeAlso: ['worship', 'blues', 'walk-up', 'amen-kadens'],
  },
  {
    id: 'worship',
    term: 'Lovsang / worship',
    category: 'sjanger',
    noAutoLink: true,
    short:
      'Moderne menighetsmusikk i pop-språk: enkle akkordrekker (ofte firegrepet), åpne sus-klanger, pads og god plass til tekst og fellessang.',
    body: 'Worship-sjangeren (Hillsong, Bethel, norske lovsangsmiljøer) bruker popens verktøy i gudstjenesten: fire-akkorders rekker, tydelige byggende former (vers → refreng → bro) og produksjonslyd med pads og delay.\n\nPianistens rolle er oftest å BÆRE, ikke briljere: åpne voicinger uten for mange terser, rolige rytmefigurer, og dynamikk som følger menigheten. Mindre er som regel mer.\n\nKurset «Lovsang-verktøykasse» samler det praktiske: intro-pads, firegrep-komp, fills mellom fraser og verdige avslutninger.',
    seeAlso: ['gospel', 'firegrep', 'sus-akkord', 'ccm'],
  },
  {
    id: 'bebop',
    term: 'Bebop',
    aliases: ['bebop-linjer', 'bebop-linje', 'bop'],
    category: 'sjanger',
    short:
      'Jazzstilen fra 1940-tallet med hurtige, kromatikk-rike enstemmige linjer over ii–V–I-akkorder — jazzens «gloseforråd».',
    body: 'Bebop (Charlie Parker, Bud Powell) flyttet jazzen fra dansemusikk til lytterkunst: raske tempoer, virtuose åttedelslinjer og harmonikk som skifter akkord i høyt tempo.\n\nKjennetegnet er linjene: skala- og akkordtoner flettet sammen med kromatiske gjennomgangstoner, plassert slik at akkordtonene lander på de tunge slagene.\n\nSelv om du aldri skal spille bebop i kirken, gir bebop-linjer over ii–V–I deg et vokabular som løfter alt annet — gospel-runs er nære slektninger. Prøv «jazz-ii-v-i-bebop» i biblioteket.',
    seeAlso: ['ii-v-i', 'kromatisk', 'run'],
  },
  {
    id: 'blues',
    term: 'Blues',
    aliases: ['bluesen', '12-takters'],
    category: 'sjanger',
    short:
      'Grunnfjellet under gospel, jazz og rock: 12-takters form, blues-skala, shuffle-følelse og «blå» toner som skurrer deilig mot durakkordene.',
    body: 'Bluesen oppsto i det amerikanske sørlandet og deler røtter (og mange fraser) med gospelen. Standardformen er 12 takter med akkordene I, IV og V i fast mønster.\n\nDet karakteristiske er de «blå» tonene: senket ters og septim sunget/spilt mot durakkorder. Det er den kontrollerte skurringen som gir blues (og gospel) sin sødme.\n\nKurset «Blues fra grunnen» tar deg gjennom sakte linjer, blues-skalaen, turnarounds og shuffle-komp — alt du trenger for å høres hjemme i språket.',
    seeAlso: ['blues-skala', 'shuffle', 'gospel', 'boogie-woogie'],
  },
  {
    id: 'boogie-woogie',
    term: 'Boogie-woogie',
    aliases: ['boogie', 'boogie-bass', 'boogiewoogie'],
    category: 'sjanger',
    short:
      'Bluespiano med motorisk, rullende venstrehåndsbass i åttedeler — festversjonen av bluesen. Venstrehånden er hele hemmeligheten.',
    body: 'Boogie-woogie er pianostilen der venstre hånd spiller et fast, rullende bassmønster (ofte oktaver eller brutte akkorder i shuffle-åttedeler) mens høyre hånd improviserer fritt over.\n\nDen ble husfest-musikk i USA på 1920–40-tallet, og teknikken lever videre i rock’n’roll, gospel-shouts og jubelpartier.\n\nNøkkelen er utholdenhet i venstrehånden: mønsteret må gå av seg selv før høyrehånden får slippe til. Kurset «Venstrehånd-teknikk» bygger akkurat den muskelen.',
    seeAlso: ['blues', 'stride', 'shuffle', 'gaende-bass'],
  },
  {
    id: 'stride',
    term: 'Stride',
    aliases: ['stride-piano', 'stride piano'],
    category: 'sjanger',
    short:
      'Pianostil der venstrehånden «skrever»: dyp basstone på 1 og 3, akkord i mellomleiet på 2 og 4. Hele kompet i én hånd.',
    body: 'Stride (av «å skreve») er jazzpianoets eldste kraftverk: venstre hånd hopper mellom dyp bass (slag 1 og 3) og akkord rundt midten av klaviaturet (slag 2 og 4) — bass og komp i samme hånd, mens høyre spiller melodi.\n\nStilen dominerte 1920-tallets Harlem (James P. Johnson, Fats Waller) og er fortsatt gullstandarden for solo-piano med full lyd.\n\nDen krever presise sprang — øv sakte og se på hånden i starten. Licksene «stride-cmajor» og «stride-blues-f» gir deg grunnmønsteret.',
    seeAlso: ['ragtime', 'boogie-woogie', 'komp'],
  },
  {
    id: 'neo-soul',
    term: 'Neo-soul',
    aliases: ['neosoul', 'neo soul'],
    category: 'sjanger',
    short:
      'Moderne soul (D’Angelo, Erykah Badu) med jazzakkorder, laid-back timing og «slitne» grooves — dagens lyd i mye moderne gospel og worship.',
    body: 'Neo-soul oppsto på 1990-tallet som en retur til klassisk soul, men med jazzens harmonikk og hip-hopens rytmefølelse: rike maj7/9/13-akkorder, kvartale voicinger og trommer som ligger tungt bak pulsen.\n\nFor pianister handler stilen om voicing og timing mer enn om mange toner: få, velvalgte akkorder plassert litt bak slaget, med små melodiske svar i mellomrommene.\n\nModerne gospel og neo-soul deler i praksis vokabular. Kurset «Neo-soul voicings» viser de viktigste klangene og vampene.',
    seeAlso: ['laid-back', 'kvartal-voicing', 'vamp', 'gospel'],
  },
  {
    id: 'montuno',
    term: 'Montuno',
    aliases: ['montunoer', 'montunoen'],
    category: 'sjanger',
    short:
      'Det synkoperte, gjentakende pianomønsteret i salsa og cubansk musikk — pianoets svar på en trommefigur, låst til claven.',
    body: 'I cubansk musikk spiller pianoet sjelden «akkorder på slag» — det spiller montuno: en to- eller firetakters figur av brutte akkorder og oktaver som gjentas som et urverk, tett flettet med claven.\n\nMønsteret er nesten alltid synkopert (starter på «og»), og det er nettopp forskyvningene som gir salsaen fremdrift.\n\nMontuno er strålende synkoperingstrening for alle pianister: prøv «latin-montuno-c» i biblioteket i sakte tempo, og kjenn hvordan figuren «drar» selv uten trommer.',
    seeAlso: ['clave', 'synkopering', 'vamp'],
  },
  {
    id: 'bossa-nova',
    term: 'Bossa nova',
    aliases: ['bossa'],
    category: 'sjanger',
    short:
      'Den myke brasilianske stilen («Girl from Ipanema»): sambaens rytme nedskalert til hvisken, med rike jazzakkorder og rolig, synkopert komp.',
    body: 'Bossa nova oppsto i Rio på 1950-tallet da sambarytmen ble flyttet fra karneval til stue: samme synkoper, men spilt mykt og lavmælt, med gitar- eller pianokomp og jazzens akkordfarger.\n\nPå piano betyr det: venstrehånd med rolig bassfigur, høyrehånd med synkoperte akkordstøt — og aldri hastverk.\n\nLicken «latin-bossa-am» gir deg grunnkompet. Hemmeligheten er å holde det HELT jevnt og avslappet — bossaen tåler ikke stress.',
    seeAlso: ['samba', 'clave', 'komp'],
  },
  {
    id: 'samba',
    term: 'Samba',
    category: 'sjanger',
    short:
      'Brasils karnevalsrytme: hurtig totakts-følelse med konstant sekstendelsdriv og sterk synkopering. Bossaens energiske storebror.',
    body: 'Samba går i rask totakt med et vedvarende sekstendels-teppe under — tenk et helt karnevalstog av trommer. På piano gjenskapes drivet med synkoperte akkordstøt og en bass som pendler på tunge slag.\n\nDer bossaen hvisker, roper sambaen — men mønstrene er i familie, så det du lærer i én stil, overføres til den andre.\n\nPrøv «latin-samba-c» sakte først: synkopene skal være presise før du skrur opp tempoet.',
    seeAlso: ['bossa-nova', 'synkopering', 'clave'],
  },
  {
    id: 'bolero',
    term: 'Bolero',
    aliases: ['boleroen'],
    category: 'sjanger',
    short:
      'Den langsomme, romantiske latinstilen — rolig puls, myke brutte akkorder og god plass til melodien. Latin-musikkens ballade.',
    body: 'Boleroen (den cubansk/meksikanske, ikke Ravels) er latinmusikkens kjærlighetsballade: rolig tempo, vuggende akkompagnement av brutte akkorder, og melodien i sentrum.\n\nFor pianister er den en fin inngang til latin-repertoaret: rytmen er overkommelig i sakte tempo, men krever samme presisjon i synkopene som de raskere stilene.\n\n«latin-bolero-g» i biblioteket viser grunnmønsteret — spill det med stor ro.',
    seeAlso: ['bossa-nova', 'arpeggio'],
  },
  {
    id: 'cha-cha-cha',
    term: 'Cha-cha-cha',
    aliases: ['cha-cha'],
    category: 'sjanger',
    short:
      'Cubansk danserytme i behagelig tempo, oppkalt etter det karakteristiske «cha-cha-cha»-trippelet i figuren. Tydelig, firkantet og danservennlig.',
    body: 'Cha-cha-cha-en oppsto på 1950-tallet som en roligere, mer markert slektning av mambo — laget for at dansere skulle høre trinnene tydelig. Navnet hermer det doble hurtigtrinnet i figuren.\n\nPå piano spilles den med tydelige, nesten staccato akkordstøt og en enkel, markert bass — mindre flytende enn bossa, mer «på» enn bolero.\n\n«latin-chacha-a» i biblioteket gir grunnfiguren.',
    seeAlso: ['montuno', 'clave'],
  },
  {
    id: 'ragtime',
    term: 'Ragtime',
    category: 'sjanger',
    short:
      'Den skrevne forløperen til jazzpiano (Scott Joplin, ca. 1900): marsjbass i venstre, synkopert («ragged») melodi i høyre.',
    body: 'Ragtime var USAs første pianopop: komponerte stykker der venstre hånd holder streng marsjtakt (bass–akkord, bass–akkord) mens høyre hånd spiller synkopert melodi som «river» mot pulsen — derav navnet (ragged time).\n\nStilen er stride-pianoets mor og en glimrende skole i rytmisk uavhengighet mellom hendene.\n\nI biblioteket ligger ragtime under stride-kategorien — samme venstrehåndsteknikk, strengere rytme.',
    seeAlso: ['stride', 'synkopering'],
  },
  {
    id: 'ccm',
    term: 'CCM',
    aliases: ['contemporary christian music'],
    category: 'sjanger',
    short:
      'Contemporary Christian Music — samlebetegnelsen på moderne kristen popmusikk for radio og strømming, tett beslektet med worship-sjangeren.',
    body: 'CCM er bransjebetegnelsen på kristen populærmusikk produsert for lytting (radio, strømming) — mens worship-begrepet oftere brukes om musikk laget for menighetssang. Grensene er flytende, og artister beveger seg mellom begge.\n\nMusikalsk følger CCM til enhver tid popmusikkens produksjonsspråk — i dag betyr det pop/rock-strukturer, synth-pads og radiovennlige refrenger.\n\nFor pianisten er verktøyene de samme som i worship: firegrep, sus-klanger og tekstbærende enkelhet. Licken «ccm-pop-worship-c» viser stilen.',
    seeAlso: ['worship', 'firegrep'],
  },

  // ───────────────────────── Teknikk og spillemåter ─────────────────────────
  {
    id: 'lick',
    term: 'Lick',
    aliases: ['licks', 'licken', 'lickene'],
    category: 'teknikk',
    short:
      'En kort, gjenbrukbar musikalsk frase — en «glose» i det musikalske språket. Lærer du mange licks, kan du snakke stilen flytende.',
    body: 'En lick er en liten bit ferdig musikk — gjerne 1–8 takter — som kan flyttes mellom sanger og situasjoner: en walk-up her, et fill der, en avslutning når det trengs.\n\nÅ lære licks er som å lære gloser og faste uttrykk i et språk: du imiterer først, og etter hvert kombinerer og bøyer du dem til noe eget. Alle store gospel- og jazzmusikere har bygget vokabularet sitt akkurat slik.\n\nHele denne appen er bygget rundt idéen: et kuratert lick-bibliotek du kan øve i alle tolv tonearter, i ditt tempo.',
    seeAlso: ['fill', 'run', 'transponering'],
  },
  {
    id: 'run',
    term: 'Run',
    category: 'teknikk',
    noAutoLink: true,
    short:
      'Et hurtig løp av toner opp eller ned klaviaturet — gospelens og jazzens fyrverkeri. Bygges oftest av skala- eller pentatontoner.',
    body: 'Et run er en rask kaskade av enkelttoner — typisk ned fra en høy tone som svar på en sunget frase, eller opp mot et klimaks. I gospel er nedadgående pentaton-runs selve signaturen.\n\nHemmeligheten er at runs er mindre improviserte enn de høres ut: de fleste er innøvde mønstre (grupper på 3–4 toner som gjentas nedover) som kan avfyres trygt i riktig toneart.\n\nØv dem SAKTE med jevn fingersetting til mønsteret går av seg selv — fart er en bivirkning av trygghet. Kategorien «Run» i biblioteket har varianter fra enkle til virtuose.',
    seeAlso: ['pentatonskala', 'fill', 'lick'],
  },
  {
    id: 'fill',
    term: 'Fill',
    category: 'teknikk',
    noAutoLink: true,
    short:
      'En kort melodisk innskytelse som fyller pausene — typisk mellom sanglinjer eller i overgangen mellom vers og refreng.',
    body: 'Når forsangeren puster, svarer pianoet: det er fillet. En liten oppadgående figur, et par akkordbrytninger, en mini-run — nok til å holde musikken levende uten å forstyrre teksten.\n\nGode fills er korte, lander presist før neste innsats, og varierer: ikke samme figur i hver pause. Lytt til gode gospelpianister — de «snakker» med forsangeren gjennom fillsene.\n\nKategorien «Fill» i biblioteket gir deg et startvokabular; Krydre-fanen i Spill smartere foreslår fills som passer akkorden du står på.',
    seeAlso: ['run', 'lick', 'komp'],
  },
  {
    id: 'komp',
    term: 'Komp',
    aliases: ['kompe', 'komping', 'kompet', 'akkompagnement'],
    category: 'teknikk',
    short:
      'Akkompagnementet — måten du spiller akkorder rytmisk under sang eller solist. God komp bærer musikken uten å være i veien.',
    body: 'Komp (av akkompagnement; jazzfolk sier «comping») er pianistens hovedjobb i de fleste sammenhenger: legge akkordene under melodien med riktig rytme, klang og styrke.\n\nGodt komp handler om valg: hvilken voicing, hvor på slaget, hvor tett — og ikke minst hvor mye LUFT. Tommelfingerregel: spiller noen andre melodi, hold deg unna deres register og pauser.\n\nKategorien «Komp» i biblioteket viser mønstre i ulike stilarter — fra rolig lovsangs-komp til shuffle og montuno.',
    seeAlso: ['voicing', 'groove', 'fill'],
  },
  {
    id: 'gaende-bass',
    term: 'Gående bass',
    aliases: ['walking bass', 'gående basslinje'],
    category: 'teknikk',
    short:
      'Basslinje som «går» i jevne fjerdedeler fra akkord til akkord — jazzens vandrende fundament, også flott i venstrehånden på piano.',
    body: 'En gående bass spiller én tone per taktslag og velger toner som leder mot neste akkord: akkordtoner på de tunge slagene, skala- og kromatiske toner som trapper i mellom.\n\nFra C til F kan linjen gå C–D–E–F (diatonisk) eller C–A–Ab–G om du skal mot G — det finnes alltid flere gyldige ruter, og det er sjåførens valg som gir sving.\n\nPå piano legger du den i venstre hånd under akkorder i høyre. Overgangs-generatoren i Spill smartere har «Gående bass» som eget virkemiddel mellom tonearter.',
    seeAlso: ['walk-up', 'kromatisk', 'boogie-woogie'],
  },
  {
    id: 'arpeggio',
    term: 'Arpeggio',
    aliases: ['arpeggioer', 'arpeggiert', 'brutte akkorder', 'brutt akkord', 'akkordbrytning', 'akkordbrytninger'],
    category: 'teknikk',
    short:
      'Å spille akkordens toner etter hverandre i stedet for samtidig — «brutt akkord». Grunnteknikken bak ballade-komp, boleroer og glitrende fills.',
    body: 'Arpeggio (italiensk, «som en harpe») betyr at akkordtonene C–E–G spilles én og én — oppover, nedover eller i mønster — i stedet for som ett samlet grep.\n\nDet er en av pianoets mest anvendelige teknikker: rolige arpeggioer gir bølgende ballade-akkompagnement; raske gir glans og virtuositet; brutte oktaver gir boogie-bass.\n\nØv dem med jevn klang (ingen tone sterkere enn naboene) og rolig håndledd — da låter selv enkle treklanger dyrt.',
    seeAlso: ['akkordtoner', 'komp', 'glissando'],
  },
  {
    id: 'pentatonskala',
    term: 'Pentatonskala',
    aliases: ['pentatonisk', 'pentaton', 'pentatonskalaen', 'pentatone'],
    category: 'teknikk',
    short:
      'Femtoneskala uten halvtonetrinn (C–D–E–G–A i C-dur) — den «trygge» skalaen der nesten alt låter bra. Gospel-runs’ favorittmateriale.',
    body: 'Penta = fem: skalaen har bare fem toner. Dur-pentaton i C er C–D–E–G–A (spill de svarte tangentene fra F# — det er også en pentatonskala!). Fordi halvtonene er fjernet, finnes det nesten ingen «feil» toner å lande på.\n\nDerfor er pentatonen improvisasjonens beste startsted: du kan bevege deg fritt over I-, IV- og V-akkorder uten å skurre.\n\nGospel-runs bygges i stor grad av pentatont materiale i grupper på tre og fire toner. Licken «pentatonic-run» viser grunnmønsteret.',
    seeAlso: ['run', 'blues-skala', 'skala'],
  },
  {
    id: 'blues-skala',
    term: 'Blues-skala',
    aliases: ['blues-skalaen', 'bluesskala', 'blue notes', 'blå toner'],
    category: 'teknikk',
    short:
      'Moll-pentaton pluss den «blå» tonen (senket kvint): C–Eb–F–Gb–G–B i C. Skurrer deilig mot durakkorder — selve blues-lyden.',
    body: 'Ta moll-pentatonskalaen (C–Eb–F–G–B) og legg til en kromatisk tone mellom F og G (Gb) — det er blues-skalaen. Den ekstra tonen, «blue note», er skalaens krydder.\n\nMagien oppstår i friksjonen: skalaens Eb og B gnisser mot durakkordens E og H, og akkurat den gnisningen ER blues- og gospelsounden. Spill blues-skalaen i C over en vanlig C7-akkord og hør selv.\n\nLicken «blues-scale-lick-a» og kurset «Blues fra grunnen» setter skalaen i praktisk arbeid.',
    seeAlso: ['blues', 'pentatonskala', 'kromatisk'],
  },
  {
    id: 'glissando',
    term: 'Glissando',
    aliases: ['gliss', 'glissandoer'],
    category: 'teknikk',
    short:
      'Å skli over tangentene med fingeren/neglen slik at alle tonene på veien klinger — pianoets «swoosh»-effekt, mye brukt i gospel-klimaks.',
    body: 'Et glissando lager du ved å dra neglsiden av fingrene (oftest tommel eller pekefinger-ryggen) raskt over de hvite tangentene, opp eller ned. Resultatet er en strøm av toner — pianoets svar på en trommevirvel.\n\nI gospel brukes gliss som utropstegn: opp mot et refrengs første slag, eller ned fra en høy topp som avrunding.\n\nTeknikktips: bruk neglen, ikke fingertuppen (det gjør vondt), hold hånden avslappet, og TIME landingen — glisset er bare opptakten; poenget er tonen du lander på.',
    seeAlso: ['run', 'grace-note'],
  },
  {
    id: 'grace-note',
    term: 'Grace note (forslag)',
    aliases: ['grace notes'],
    category: 'teknikk',
    short:
      'En lynrask pyntetone rett før hovedtonen — som å «skli inn» på tonen fra tangenten ved siden av. Gir vokal, bluesy karakter.',
    body: 'Grace note (norsk: forslag) er en bitteliten tone uten egen rytmisk verdi som spilles hurtig rett før hovedtonen — oftest halvtonen under, slik at det høres ut som du sklir inn på tonen slik en sanger gjør.\n\nI gospel og blues er dette overalt: spill Eb og E nesten samtidig (Eb hårfint først) og hør den vokale «smørje»-effekten. På piano, der du ikke kan bøye toner, er dette den nærmeste erstatningen for en «bend».\n\nBrukt med måte gir grace notes melodilinjene sjel; brukt overalt blir det tics. Lytt etter dem i gospel- og neo-soul-licksene.',
    seeAlso: ['glissando', 'blues-skala'],
  },
  {
    id: 'oktavdobling',
    term: 'Oktavdobling',
    aliases: ['oktavdoblinger', 'i oktaver', 'oktavbass'],
    category: 'teknikk',
    short:
      'Å spille samme tone i to oktaver samtidig (f.eks. C med tommel og lillefinger). Gir melodi eller bass dobbel tyngde og glans.',
    body: 'Når én tone ikke er nok, dobler du den oktaven over eller under: samme tonenavn, spilt samtidig med tommel og lillefinger. Melodien får umiddelbart mer kraft — det er pianistens «unison med seg selv».\n\nGospelpianister spiller gjerne hele run-linjer i oktaver for maksimal effekt, og boogie-bass er ofte brutte oktaver i venstre hånd.\n\nØv oktavgrep med avslappet håndledd og fast håndform («bro» mellom finger 1 og 5) — spenning i underarmen er signalet om pause.',
    seeAlso: ['run', 'boogie-woogie'],
  },

  // ───────────────────────── Notasjon og teori ─────────────────────────
  {
    id: 'toneart',
    term: 'Toneart',
    aliases: ['tonearter', 'tonearten'],
    category: 'notasjon',
    short:
      'Musikkens «hjemmeadresse»: hvilken skala og grunntone alt kretser rundt — f.eks. C-dur eller a-moll. Bestemmer hvilke toner som føles hjemme.',
    body: 'En toneart utpeker én tone som hjem (grunntonen) og én skala som tonematerialet. «C-dur» betyr: C er hjem, og dur-skalaen fra C (de hvite tangentene) er tonene.\n\nDur og moll er de to hovedfamiliene: dur bygges med stor ters og oppleves ofte lys, moll med liten ters og oppleves mørkere. Hver dur-toneart har en parallell moll som deler de samme tonene (C-dur ↔ a-moll).\n\nI appen velger du toneart fritt — alle licks er lagret som noter og transponeres matematisk perfekt til alle tolv. Sangere elsker deg når du kan ta sangen «en tone ned».',
    seeAlso: ['transponering', 'skala', 'kvintsirkel', 'fortegn'],
  },
  {
    id: 'transponering',
    term: 'Transponering',
    aliases: ['transponere', 'transponert', 'transponer', 'transponeres'],
    category: 'notasjon',
    short:
      'Å flytte musikk til en annen toneart — samme melodi og akkordforhold, nytt toneleie. I appen: ett trykk, matematisk perfekt.',
    body: 'Å transponere er å flytte alt i musikken like langt opp eller ned: melodien C–E–G i C-dur blir D–F#–A i D-dur. Forholdet mellom tonene er uendret — bare høyden flytter seg.\n\nFor kirkemusikere er dette hverdagskost: sangen står i Ab, men forsangeren vil ha G. Å kunne spille de samme licksene i flere tonearter er forskjellen på å kunne et triks og å kunne et språk.\n\nFordi appen lagrer noter (MIDI-data) og aldri lyd, er transponering her bare et tallskifte — ingen kunstige artefakter, perfekt klang i alle tolv tonearter. Bruk det: øv hver lick i minst tre tonearter.',
    seeAlso: ['toneart', 'kvintsirkel'],
  },
  {
    id: 'fortegn',
    term: 'Fortegn',
    aliases: ['faste fortegn', 'kryss og b', 'løse fortegn'],
    category: 'notasjon',
    short:
      'Kryss (#) og b-er i notebildet. Faste fortegn ved nøkkelen forteller tonearten; løse fortegn gjelder én takt.',
    body: 'Et kryss (#) hever tonen en halvtone, en b senker den. Fortegnene helt til venstre på notelinjen (de faste) gjelder hele stykket og røper tonearten: ingen fortegn = C-dur/a-moll, ett kryss = G-dur/e-moll, to b-er = Bb-dur/g-moll osv.\n\nLøse fortegn dukker opp underveis og gjelder ut takten — de signaliserer kromatikk, altså toner utenfor tonearten.\n\nKvintsirkelen er fortegnenes kart: ett steg med klokka = ett kryss til; ett steg mot = en b til.',
    seeAlso: ['toneart', 'kvintsirkel', 'enharmonisk'],
  },
  {
    id: 'intervall',
    term: 'Intervall',
    aliases: ['intervaller', 'ters', 'kvint', 'kvart', 'septim', 'sekst'],
    category: 'notasjon',
    short:
      'Avstanden mellom to toner, navngitt med tall: sekund (2), ters (3), kvart (4), kvint (5), sekst (6), septim (7), oktav (8).',
    body: 'Intervallnavnene teller skalatrinn fra den nederste tonen, inklusive begge: C til E er en ters (C-D-E = 3), C til G en kvint (5).\n\nDette er byggematerialet for alt annet: akkorder stables av terser, kvartale voicinger av kvarter, kvintsirkelen går i kvinter, og «septim»-akkordene (maj7, m7, 7) har navn etter intervallet på toppen.\n\nLær deg å HØRE de vanligste: tersen er dur/moll-fargen, kvinten er åpen og hul, septimen er lengselen. Da blir teorien plutselig praktisk.',
    seeAlso: ['akkordsymboler', 'oktav', 'kvintsirkel'],
  },
  {
    id: 'oktav',
    term: 'Oktav',
    aliases: ['oktaver', 'oktaven'],
    category: 'notasjon',
    short:
      'Avstanden fra en tone til neste tone med samme navn (C til nærmeste C) — åtte trinn. Tonene klinger «like», bare lysere/mørkere.',
    body: 'Etter sju forskjellige toner (C-D-E-F-G-A-H) kommer du til C igjen — en oktav høyere. Fysisk svinger den nye tonen nøyaktig dobbelt så fort, og øret opplever dem som «samme tone» i ulikt leie.\n\nDet er derfor menn og kvinner kan synge «samme melodi» en oktav fra hverandre og det låter samlet.\n\nPå klaviaturet er oktaven grepet mellom tommel og lillefinger for de fleste hender — grunnlaget for oktavdoblinger og boogie-bass.',
    seeAlso: ['intervall', 'oktavdobling'],
  },
  {
    id: 'skala',
    term: 'Skala',
    aliases: ['skalaer', 'skalaen', 'durskala', 'mollskala'],
    category: 'notasjon',
    short:
      'Et ordnet utvalg toner å bygge musikk av — durskalaen («do-re-mi») er den vanligste. Skalaen er toneartens råmateriale.',
    body: 'En skala er en oppskrift på hvilke toner som er «inne»: durskalaen har mønsteret hel-hel-halv-hel-hel-hel-halv (C-D-E-F-G-A-H-C fra C), mollskalaen begynner på durskalaens sjette trinn.\n\nMelodier og akkorder i en toneart hentes fra skalaens toner; improvisasjon handler langt på vei om å kjenne skalaen så godt at fingrene finner den blindt.\n\nUtover dur og moll møter du i denne appen særlig pentatonskalaen (fem toner) og blues-skalaen — begge mindre, «tryggere» utvalg for improvisasjon.',
    seeAlso: ['toneart', 'pentatonskala', 'blues-skala', 'skalatrinn'],
  },
  {
    id: 'skalatrinn',
    term: 'Skalatrinn (romertall)',
    aliases: ['romertall', 'skalatrinnene', 'grader', 'trinnanalyse'],
    category: 'notasjon',
    short:
      'Akkorder navngitt etter hvilket trinn i skalaen de står på: I, ii, iii, IV, V, vi. Store tall = dur, små = moll. Uavhengig av toneart!',
    body: 'I stedet for akkordnavn (C, Dm, G7) kan man bruke trinn-tall: I er akkorden på skalaens første tone, V på den femte. Store romertall betyr dur (I, IV, V), små betyr moll (ii, iii, vi).\n\nGevinsten er at analysen blir toneart-uavhengig: «I–V–vi–IV» beskriver både C–G–Am–F (i C-dur) og G–D–Em–C (i G-dur). Lærer du rekkene som tall, kan du dem automatisk i alle tolv tonearter.\n\nDet er derfor appen (og musikere flest) sier «2-5-1» og «firegrep» — det er trinn-språk. Nashville-systemet er samme idé med vanlige tall.',
    seeAlso: ['ii-v-i', 'funksjonsharmonikk', 'toneart'],
  },
  {
    id: 'enharmonisk',
    term: 'Enharmonisk',
    aliases: ['enharmoniske', 'enharmonisk omtydning'],
    category: 'notasjon',
    short:
      'To navn, samme tangent: C# og Db er enharmonisk like. Hvilket navn som er «riktig» avhenger av tonearten og retningen.',
    body: 'På pianoet er C# og Db samme svarte tangent — de er enharmoniske. Navnevalget følger sammenhengen: i A-dur (som har kryss) heter tonen C#, i Ab-dur (som har b-er) heter den Db.\n\nTommelfingerregel i noter: kryss brukes gjerne på vei OPP, b-er på vei NED — da leser øyet retningen riktig.\n\nEnharmonisk omtydning er også et modulasjonstriks: tolke en tone/akkord om til sitt «andre navn» og fortsette i en helt ny toneart derfra.',
    seeAlso: ['fortegn', 'toneart'],
  },
  {
    id: 'notenokler',
    term: 'Nøkler (G- og F-nøkkel)',
    aliases: ['g-nøkkel', 'f-nøkkel', 'bassnøkkel', 'diskantnøkkel'],
    category: 'notasjon',
    short:
      'Symbolene først på notelinjene som forteller hvilke toner linjene betyr: G-nøkkel for høyre hånd (lyst), F-nøkkel for venstre (mørkt).',
    body: 'Notesystemet for piano har to notelinje-sett: øverst G-nøkkelen (diskantnøkkelen), der spiralen omslutter linjen for tonen G — her noteres som regel høyre hånd. Nederst F-nøkkelen (bassnøkkelen), der de to prikkene omkranser F-linjen — venstre hånds territorium.\n\nMidt mellom systemene ligger enstrøken C («middle C») på en egen hjelpelinje — samme tone sett fra begge nøklene.\n\nNotasjonsvisningen i appen bruker begge nøkler, med licksene fordelt på hender akkurat som du skal spille dem.',
    seeAlso: ['fortegn'],
  },
  {
    id: 'midi',
    term: 'MIDI',
    aliases: ['midi-keyboard', 'midi-data'],
    category: 'notasjon',
    short:
      'Standardspråket digitale instrumenter snakker: «hvilken tangent, hvor hardt, hvor lenge» — noter som data, ikke lyd.',
    body: 'MIDI (Musical Instrument Digital Interface, 1983) beskriver musikk som hendelser: tangent nummer 60 (enstrøken C) trykkes ned med styrke 80, slippes etter et halvt sekund. Ingen lyd lagres — bare oppskriften.\n\nDet er derfor MIDI-musikk kan transponeres og tempo-endres uten kvalitetstap: det er bare tall som endres, og en lydmodul (i appen: samplede pianolyder) spiller oppskriften.\n\nHar du et MIDI-keyboard, kan du koble det til nettleseren og bruke det i øvemodusen — appen hører da hvilke tangenter du faktisk spiller.',
    seeAlso: ['velocity', 'vent-modus', 'transponering'],
  },
  {
    id: 'velocity',
    term: 'Velocity (anslagsstyrke)',
    aliases: ['anslagsstyrke'],
    category: 'notasjon',
    short:
      'MIDI-målet for hvor hardt en tangent slås an (0–127). Styrer styrke og klangfarge — det som gjør spill levende i stedet for maskinelt.',
    body: 'Hver tone i MIDI har en velocity-verdi mellom 1 og 127: hvor fort (og dermed hardt) tangenten ble trykket. Lav verdi = mykt og dust, høy = sterkt og briljant.\n\nDynamikk — variasjonen i anslagsstyrke — er halve musikken: samme noter med flat velocity låter som en ringeklokke, med formet dynamikk låter det som musikk.\n\nLicksene i appen har innspilte velocity-verdier, så avspillingen puster naturlig. Når du selv øver: overdriv gjerne dynamikken i starten; det er lettere å dempe senere enn å legge til.',
    seeAlso: ['midi'],
  },

  // ───────────────────────── Begreper i appen ─────────────────────────
  {
    id: 'vent-modus',
    term: 'Vent-modus (øvemodus)',
    aliases: ['ventmodus', 'øvemodus', 'øvemodusen', 'vent-modusen'],
    category: 'app',
    short:
      'Øvingsform der appen venter på deg: neste tone spilles først når DU har truffet riktig tangent — på MIDI-keyboard eller skjermen.',
    body: 'I vanlig avspilling går licken i sitt tempo uansett hva du gjør. I vent-modus snus det: appen stopper på hver tone og går ikke videre før du har spilt riktig tangent. Feil tangent? Den venter tålmodig videre.\n\nDette gjør at du kan lære licken tone for tone i DITT tempo, med hendene på klaviaturet i stedet for øynene på en video. Koble til et MIDI-keyboard, eller klikk på appens klaviatur — begge deler fungerer.\n\nKombiner med «Trapp opp»: når licken sitter i vent-modus, øker appen tempoet gradvis for hver runde du klarer.',
    seeAlso: ['midi', 'beste-bpm', 'metronom'],
  },
  {
    id: 'a-b-loop',
    term: 'A–B-løkke',
    aliases: ['a-b-loop', 'loop a–b', 'loop a-b', 'a–b-loop', 'seksjonsloop'],
    category: 'app',
    short:
      'Marker et utsnitt av licken (fra punkt A til punkt B) og la bare det gå i løkke — perfekt for å drille akkurat den vanskelige takten.',
    body: 'De fleste licks har ett vrient sted og mye som allerede sitter. I stedet for å spille hele licken om og om igjen, setter du A-punktet rett før problemet og B-punktet rett etter — og øver bare det.\n\nMålrettet repetisjon av det svakeste leddet er den mest effektive øvingen som finnes. Fire takter kan bli til fire toner, om det er dét som trengs.\n\nDu finner A–B-løkken under «Flere verktøy» i øvingsvisningen. Kombiner gjerne med lavere tempo, og utvid utsnittet etter hvert som det setter seg.',
    seeAlso: ['vent-modus', 'metronom'],
  },
  {
    id: 'band-modus',
    term: 'Band-modus',
    aliases: ['bandmodus', 'band-modusen'],
    category: 'app',
    short:
      'Appen spiller den ene hånden, du spiller den andre — som å øve med en duo-partner som aldri blir sliten.',
    body: 'Mange licks har to selvstendige hender: en gående bass i venstre og linjer i høyre, for eksempel. Å sette dem sammen er ofte det vanskeligste steget.\n\nBand-modus deler jobben: appen tar venstrehånden mens du øver høyre (eller omvendt). Du hører helheten hele tiden — mens du bare trenger å mestre din halvdel.\n\nStart med appens tempo lavt, bytt hånd ofte, og skru av band-modusen når begge hender kan jobben hver for seg. Du finner den under «Flere verktøy» i øvingsvisningen.',
    seeAlso: ['vent-modus', 'a-b-loop'],
  },
  {
    id: 'krydre',
    term: 'Krydre (spice)',
    aliases: ['spice it up'],
    category: 'app',
    short:
      'Fanen i Spill smartere som foreslår fills, reharmoniseringer og voicinger for akkorden du står på — i din valgte toneart.',
    body: 'Krydre-fanen svarer på det praktiske spørsmålet: «jeg står på denne akkorden i denne sangen — hva kan jeg gjøre med den?»\n\nVelg toneart og akkord (som skalatrinn), og appen foreslår tre typer krydder: bibliotek-fills som passer over akkorden, reharm-forslag (andre akkorder som kan erstatte eller pynte den) og voicing-varianter fra shell til gospel-spread. Nivåkontrollen styrer hvor forsiktig eller dristig krydderet skal være.\n\nAlt kan spilles av direkte og lagres til listene dine — generert innhold øves akkurat som bibliotek-licks.',
    seeAlso: ['reharmonisering', 'voicing', 'fill'],
  },
  {
    id: 'overganger',
    term: 'Overganger (transitions)',
    category: 'app',
    noAutoLink: true,
    short:
      'Fanen i Spill smartere som genererer spillbare veier fra én toneart til en annen — velg fra og til på kvintsirkelen, få tre rangerte forslag.',
    body: 'Skal du fra sangen i C til sangen i Eb uten pinlig stillhet? Overganger-fanen lager broen: velg fra- og til-toneart på kvintsirkelen, og appen genererer tre forslag rangert etter hvor sømløse de er.\n\nForslagene bruker ulike virkemidler — pivotakkord, ii–V inn i ny toneart, sekundærdominant, gående bass — og hvert forslag kan spilles av, granskes akkord for akkord og lagres til en øvingsliste.\n\nDette er medley-verktøyet: lær deg overgangene mellom toneartene dere faktisk bruker i menigheten, så henger settet sammen.',
    seeAlso: ['modulasjon', 'kvintsirkel', 'pivotakkord'],
  },
  {
    id: 'beste-bpm',
    term: 'Beste BPM',
    category: 'app',
    short:
      'Din personlige rekord per lick: det høyeste tempoet du har klart licken i. Vises i biblioteket og på fremgangssiden.',
    body: 'Hver gang du fullfører en lick i øvingsvisningen, husker appen tempoet — og det høyeste du har klart, lagres som din «beste BPM» for den licken.\n\nTallet gjør fremgang synlig: licken du strevde med i 60 BPM i forrige måned, sitter kanskje i 96 nå. Små tall som vokser er god motivasjon.\n\nDu ser beste BPM på lick-kortene i biblioteket og samlet på Stats-siden. Rekordene lagres lokalt i nettleseren din.',
    seeAlso: ['bpm', 'vent-modus'],
  },
  {
    id: 'akkordskjema',
    term: 'Akkordskjema',
    aliases: ['akkordskjemaet'],
    category: 'app',
    short:
      'Raden med akkordsymboler over klaviaturet i øvingsvisningen — viser hvilken akkord som klinger på hvert slag, transponert til din toneart.',
    body: 'Akkordskjemaet er lickens harmoniske kart: en tidslinje av akkordsymboler som følger avspillingen, med gjeldende akkord uthevet.\n\nDet lærer deg å tenke som en musiker: ikke «disse 17 tonene», men «en linje over Dm7 → G7 → C». Ser du akkordene, kan du senere gjenskape licken i andre sammenhenger — og forstå HVORFOR tonene er valgt.\n\nSlå også på «Akkordtoner»-overlegget, så ser du akkordens toner lyse på klaviaturet samtidig.',
    seeAlso: ['akkordsymboler', 'akkordtoner'],
  },
  {
    id: 'pianorull',
    term: 'Pianorull',
    aliases: ['pianorullen', 'piano roll'],
    category: 'app',
    short:
      'Visningen der tonene er striper på en tidslinje: høyde = tangent, lengde = varighet. Lettere å lese enn noter for mange — navnet kommer fra selvspillende pianoer.',
    body: 'Pianorullen viser licken som horisontale striper: jo høyere på skjermen, jo lysere tone; jo lengre stripe, jo lengre tone. Et spillehode sveiper over mens licken spilles, og fargene skiller høyre og venstre hånd.\n\nFormatet kommer fra de gamle selvspillende pianoene, der hull i en papirrull styrte tangentene — dagens musikkprogrammer bruker samme idé.\n\nI øvingsvisningen kan du veksle mellom pianorull og tradisjonell notasjon. Bruk gjerne begge: rullen for å SE bevegelsen, notene for å lære å lese.',
    seeAlso: ['midi', 'notenokler'],
  },
  {
    id: 'tab',
    term: 'TAB (tabulatur)',
    aliases: ['tabulatur', 'tabs'],
    category: 'notasjon',
    short:
      'Gitarnotasjon med seks linjer — én per streng — der tallene viser hvilket bånd du trykker. Leses uten noteforkunnskaper.',
    body: 'Tabulatur snur notasjonen til gitarens virkelighet: de seks linjene ER strengene (nederste linje = tykkeste streng), og tallet på linjen sier hvilket bånd du trykker. 0 betyr åpen streng.\n\nStyrken er at TAB løser gitarens store tvetydighet: samme tone finnes flere steder på halsen, men TAB sier nøyaktig HVOR du skal spille den. Svakheten er at rytmen vises grovere enn i noter — derfor viser appen TAB og pianorull side om side for gitar-licks.\n\nGitar-licksene i biblioteket lagrer strengvalget per tone, så TAB-en du ser er slik licken faktisk er ment å ligge under fingrene.',
    seeAlso: ['baand', 'grep'],
  },
  {
    id: 'baand',
    term: 'Bånd',
    aliases: ['fret'],
    category: 'teknikk',
    short:
      'Metallribbene på gitarhalsen. Å «spille i 5. bånd» betyr å trykke strengen ned rett bak den femte ribben — hvert bånd hever tonen en halvtone.',
    body: 'Båndene deler gitarhalsen i halvtonetrinn: hver gang du flytter fingeren ett bånd opp, stiger tonen en halvtone — nøyaktig som å gå én tangent til høyre på pianoet.\n\nDerfor er transponering gitarens superkraft: flytt hele mønsteret to bånd opp, og du har flyttet hele licken en heltone — samme fingre, samme form. Prikk-markørene i 3., 5., 7., 9. og 12. bånd er navigasjonsmerkene; ved 12. bånd er du nøyaktig én oktav over de åpne strengene.\n\nGripebrett-visningen i appen viser båndene liggende, med de samme prikkene som på en ekte hals.',
    seeAlso: ['tab', 'transponering'],
  },
  {
    id: 'grep',
    term: 'Grep (akkordgrep)',
    aliases: ['grepene', 'akkordgrep', 'barré', 'barregrep'],
    category: 'teknikk',
    short:
      'Fingermønsteret som former en akkord på gitarhalsen. Åpne grep bruker løse strenger; barrégrep legger pekefingeren over alle og kan flyttes fritt.',
    body: 'Et grep er akkorden omsatt til fingre: hvilke strenger som trykkes hvor, hvilke som klinger åpne, og hvilke som dempes. De åpne grepene (G, C, D, Em, Am …) er gitarens grunnvokabular og klinger størst fordi løse strenger ringer med.\n\nBarrégrepet er nøkkelen videre: pekefingeren legges som en kapo over alle strengene, og resten av fingrene former et kjent grep oppå — dermed kan samme form flyttes til hvilken som helst toneart, ett bånd av gangen.\n\nFor gitar-licks med akkorder viser appen grep-diagrammer under øvingsvisningen — foreslått grep for hver akkord i licken, i den tonearten du har valgt.',
    seeAlso: ['baand', 'voicing'],
  },
  {
    id: 'rot-kvint',
    term: 'Rot og kvint',
    aliases: ['rot-kvint', 'rotkvint', 'root-fifth'],
    category: 'teknikk',
    short:
      'Bassens enkleste og mest brukte figur: grunntonen (roten) på tunge slag, kvinten som svar. Fundamentet under utallige sanger.',
    body: 'Rot og kvint er bassens grunnvokabular: spill akkordens grunntone på ener, kvinten på treer (eller som svar imellom), og du har en trygg, tydelig bunn som forteller øret nøyaktig hvilken akkord som klinger.\n\nDet er bevisst enkelt — og nettopp derfor uunnværlig. Country-bass, pop, rock og mye lovsang lever på rot–kvint; den lar alt oppå bevege seg fritt fordi bunnen er utvetydig.\n\nNeste steg er å legge til oktaven (grunntonen en oktav opp) og gjennomgangstoner mellom akkordene — men rot–kvint er stammen alt annet vokser ut fra.',
    seeAlso: ['gaende-bass', 'oktavdobling'],
  },
  {
    id: 'ghost-noter',
    term: 'Ghost-noter',
    aliases: ['ghost-note', 'ghost note', 'døde toner', 'dead notes'],
    category: 'teknikk',
    short:
      'Nesten uhørbare, dempede anslag som fyller rytmen uten tonehøyde. Det du IKKE spiller tydelig — men som får grooven til å sitte.',
    body: 'En ghost-note er et anslag spilt så svakt (eller med strengen dempet) at tonehøyden nesten forsvinner og bare den rytmiske «tikk» blir igjen. På bass og gitar gir de grooven puls mellom hovedtonene; på piano gjøres samme effekt med svært lav anslagsstyrke.\n\nHemmeligheten i funk, neo-soul og gospel: halvparten av det som gjør en lomme levende, er ghost-noter du knapt hører. De fyller de tomme sekstendedelene og gjør at hovedtonene spretter fram i kontrast.\n\nI appen er ghost-noter lagret med lav velocity — du ser dem som bleke anslag i pianorullen og hører dem som et pust under de tydelige tonene. Øv dem BEVISST svakt; det er lettere å legge til styrke senere enn å dempe.',
    seeAlso: ['velocity', 'laid-back', 'groove'],
  },
]

export const GLOSSARY_BY_ID: ReadonlyMap<string, GlossaryTerm> = new Map(
  GLOSSARY.map((t) => [t.id, t]),
)
