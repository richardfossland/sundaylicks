# Nattrapport — SundayLicks kvalitetsrunde natt til 2026-08-09

> Eier ba om en natt med utsatt arbeid: opprydding, feiljakt og effektivisering.
> Rammer: ingen deploy, ingen prod-DB-skriving; all endring via PR med grønn CI.
> Prod (v`6fb57d35`) er URØRT hele natta — main ligger klar til deploy ved eier-OK.

## Førbilde (N0, målt på main `8979252`)

- 336 tester grønne, `cf:build` grønn
- Klient-chunks (topp): **960 KB** + **768 KB** (korpus + vexflow/tone i delte chunks)
- Total `_next/static`: **3760 KB**
- 29 åpne dependabot-sikkerhetsvarsler; 3 stale dependabot-PR-er (#44/#45/#47)

## N1 — Sikkerhet (dependabot) ✅

**Sikkerhetsvarsler: 29 → 0. Ingen åpne dependabot-PR-er igjen.**

- Merget i rekkefølge: **#44** lucide-react 0.460→1.25 (major), **#45** tailwind-merge 2→3 (major), **#48** minor-gruppe ×13 (dependabot lukket selv #47 som utdatert og åpnet #48 rebasert — samme innhold), **#49** audit-fix for de 4 siste dev-scope-varslene (lockfile-only: brace-expansion, undici, miniflare, wrangler — alle transitive under wrangler).
- **Ingen ikon-renames nødvendig:** alle 51 lucide-ikoner på tvers av 33 filer verifisert mot faktisk installert 1.25-modul (lucide beholdt deprecated aliaser gjennom 1.0).
- tailwind-merge v3 er en korrekthets-GEVINST: v2 matchet Tailwind v3-klassegrupper; repoet kjører Tailwind 4 — v3 er riktig versjon.
- Diff totalt: kun package.json + package-lock.json. Verifisert med check + cf:build før hver merge.

## N2 — Ytelse (bundle) ✅ (PR #50, merget)

**−525 KB klient-JS på alle hovedruter.** Seed-korpuset (328 licks, ~856 KB kilde) lastes nå dovent, KUN i kald fallback-sti (Supabase nede/ukonfigurert).

| Rute | Før | Etter | Delta |
| --- | ---: | ---: | ---: |
| `/` | 1405 KB | 880 KB | −525 KB |
| `/ove` | 1397 KB | 872 KB | −525 KB |
| `/bla` | 1660 KB | 1135 KB | −525 KB |
| `/spill` | 1799 KB | 1274 KB | −525 KB |

- Korpus-chunken (429 KB) refereres av NULL prerendret HTML — bevist lazy.
- Call-sites starter fra tom liste m/ skeleton-kort (gjenbrukt /bla-idiom); bonus-fiks: DailyCard skrev tidligere en TOM dagsøkt til localStorage ved tomt bibliotek.
- Kald sti live-verifisert i nettleser (unreachable Supabase-URL → alle 328 licks via fallback); varm sti re-verifisert etterpå.
- Gjenstående tung chunk: Tone.js 959 KB — egen mulighet, notert under «neste runde».

## N3 — Feiljakt (gransking + adversariell verifisering)

### G-a Skjøter/korrekthet (levert — 11 funn, omfattende REN-liste)
Hovedfunn (verifiseres før fiks):
1. **HIGH** `setInstrument` bygger aldri noden sin; Part-callbacken optional-chainer → **bytte av lyd under avspilling gjør resten av licken STUM** (også via «Neste» piano→gitar i liste — effekt-rekkefølgen ensurer piano, så flipper kind til ubygget node). playback.ts:83-87/195-199.
2. **HIGH** `fretPositions`-clampen bryter `p = tuning[s]+f`-invarianten når transponering skyver toner utenfor halsen: **112 lick×toneart-kombinasjoner (85 gitar + 27 bass) tegner FEIL tonehøyde (opptil 5 halvtoner) og gjør vent-modus UMULIG å komme videre i** (forventet tone finnes ikke på brettet; målring tegnes ikke engang). Datav verifisert mot hele korpuset. Klassisk skjøtefeil — testene velger bevisst toner som holder seg innenfor.
3. **HIGH/MED** `hand`/`bandMode` overlever liste-navigasjon inn i bass-lick (applyLick resetter ikke) → **tomt brett + stille avspilling uten synlig kontroll å angre med** (velgeren er skjult for bass).
4. **MED** A-B-loop-range lekker ut av Practice (dispose resetter ikke) → **reel og glossary-demoer starter på beat A og kuttes tidlig**.
5. **MED** Fretboard får hånd-filtrerte noter, TAB får alle → to uavhengige fretPositions-kall → **225 kombinasjoner der brett og TAB viser ULIK fingring for samme tone**.
6. **MED** Loop-eierskap splittet (onLoopToggle vs build-derivert) → A-B kan dø stille / loope mot toggle-visning.
7. **MED** /bla + SkalaTab + demoer spiller gitar/bass-licks med PIANOLYD (per-lick-overstyringen bor kun i Practice — flytt regelen inn i engine.build).
8–11 LOW: målring på første pitch-match (feil bånd), view-state hydratedRef-garanti holder ikke teknisk (selv-helende i dag), hit-flash på alle celler m/ samme pitch, stale MIDI-enhetsnavn.
**REFUTERT:** AppShell/Practice-instrumentracen fra inventaret — korrekt i dag *ved et uhell* av dynamic-import-rekkefølgen (dokumenteres/vaktes, men ingen feil nå). dispose→setInstrument trygt.

### G-b Ytelse/render (levert — 9 funn, 13 områder sjekket RENE)
Hovedfunn (verifiseres før fiks):
1. **HIGH** Practice re-rendrer hele treet 60×/sek under avspilling (currentBeat-abonnement i rot; null React.memo i hele src/) — mønsteret for fiks finnes alt i ReelCards LiveRoll-leaf.
2. **HIGH** `getDailySessionSlugs` i render-body → 60 synkrone localStorage-les + JSON.parse per sekund på ?daily=1-stien (Practice.tsx:379).
3. **HIGH** Fretboard bygger 96-cellers klikklag på nytt hver frame (~15k element-kreasjoner/sek på gitar/bass-licks).
4. **HIGH** /ove: tasting re-rendrer alle 328 LickCards per tastetrykk + O(n)-scan `practiced.includes` per kort (~108k sammenlikninger/render for storbruker).
5. **MED-HIGH** /bla: alle 328 ReelCards re-rendrer per snap (memo-grense mangler; onReplay-identitet buster memo).
6. **MED** `fetchLicks()` har ingen cache på Supabase-stien → fullt korpus (~60–100 KB gzip) refetches per /ove//bla-mount.
7. **MED** recordPractice les+skriv hele progress-blobben synkront PÅ loop-grensen (musikalsk skjøt!).
8. **MED-LOW** Glossary-demoer abonnerer 60 Hz uten playing-gate. 9. **LOW** overlay-Set realloc per frame.
RENT (eksplisitt sjekket): VexFlow redraw-gating, Tone-node-livssyklus (samples hentes ÉN gang), zustand-selektorhygiene (alle 60 call-sites), reel-virtualisering, observer-cleanup, view-state-gating, transpose/fretPositions-memo.

### G-c Data/API-integritet (levert — 31 funn + omfattende REN-liste)
Hovedfunn (verifiseres før fiks):
1. **HIGH** `/api/submit` er uautentisert, ustrupet service-role-skriving (maks gyldig rad 23,8 KB; delt Supabase-prosjekt → kan fylle kvoten for HELE suiten). Ingen rate-limit/captcha/middleware finnes.
2. **HIGH** Krydre/Spice-tonalitetsfilteret er dødt i moll: `mode` defaultes ALLTID til 'major' (zod+DB-default) så fallback-heuristikken er død kode → **13/328 licks passerer i moll; fill/turnaround/2-5-1 helt TOMME**. 37 moll-licks (inkl. `two-five-one-minor`!) står som major.
3. **HIGH** Rot-årsaken: `backfill-metadata.mjs` har feilet STILLE hele tiden — extensionless import (`analyze.ts` → '../music') + feltnavn-mismatch (`tonality`≠`mode`) + kun piano-korpus. Catch-en printer en beroligende «finnes ikke enda»-melding for en reell lastefeil. Skjøtefeil i lærebok-form.
4. **MED×6 innholdsfeil** (data-verifisert): `worship-pulse-d` hel venstrehånd +2 halvtoner feil; `gospel-worship-flow-db` +1; `gospel-passing-dim-eb` to akkorder på samme spenn; 3 akkord-etikettfeil; **9 gitar-licks krever at én streng klinger to toner samtidig (28 tilfeller — fysisk umulig)**; 51 re-attack-overlapp + 8 eksakte duplikat-anslag.
5. **MED** admin uten brute-force-vern; submit lekker rå Postgres-feil; lengde-lekkende passordsammenlikning; approve rapporterer OK på 0 rader.
6. **MED** seed-reconcile mangler (slettede licks forblir published i DB; cleanup-scriptet er en brukt engangs-liste); kurs-test validerer mot seed-filer, appen leser fra DB (strukturelt gap).
7. **MED** `identity.ts` eneste uvoktede storage-tilgang (Safari private → innsending feiler som «Nettverksfeil»); data-eksport mangler user_id/daily (eksport og reset er uenige om hva «mine data» er).
LOW: triol-stavevariasjon, 3 licks med ikke-hele takter, navneduplikat, terskel-outliers, uversjonerte storage-nøkler, quota-stillhet i collections.
RENT: zod før alle DB-kall + ekstra body-nøkler strippes (ingen privilege escalation), service-role aldri klient-side, RLS/grants korrekte, ALLE kryssreferanse-tester (glossary/demos/kurs/progresjoner), storage ellers gjennomgående try/catch+TTL+prune.

## N4 — Fikser

- **#51 (merget) — Innhold:** 35 moll-moduser (Krydre-moll gikk fra 13 treff til fullt utvalg), 2 transponerings-glipp i venstrehender (worship-pulse-d −2, gospel-worship-flow-db −1), 85 fysiske umuligheter trimmet, 5 akkord-etiketter, navneduplikat. + `seed-integrity.test.ts` (4 vakthund-klasser) som umiddelbart fanget 3 rest-tilfeller fikseren bommet på. **⚠️ Krever reseed ved deploy.**
- **#52 (merget) — Motor-skjøter:** stum-bytte-feilen (setInstrument bygger nå noden, m/ in-flight-dedup), lyd-eierskap i motoren (reel/oppslagsverk/spill spiller gitar/bass-licks med riktig lyd), hand/bandMode-reset ved lick-bytte, A-B-loop-lekkasjen, loop én-skriver, dagens-økt ut av render, progress-skriving til idle, AppShell-rekkefølgen eksplisitt (pageOverrideActive). +8 tester.
- **#53 (merget) — Render-ytelse:** playhead-abonnement kun i løv-komponenter, Fretboard+PianoRoll statiske lag memoisert, memo(LickCard)+memo(ReelCard) m/ ref-stabil onReplay, practiced-Set, useDeferredValue på søket, fetchLicks 5-min-cache, demo-abonnement gatet.
- **#54 (merget) — Transponerings-invarianten (nattas viktigste):** oktav-folding i transponerings-laget → lyd og bilde ALLTID enige; 112 feil-tegnede kombinasjoner + vent-modus-blindveiene borte; felles fingering brett↔TAB (225 avvik borte); vakthund over alle 75 fretted licks × 12 tonearter.
- **#55 (merget) — API-herding:** /api/submit har nå kroppsvakt (64 kB → 413 før parsing), globalt døgntak (100 → 429 + Retry-After) og per-innsender-tak (10/døgn; innsendinger uten id deler én bøtte så taket ikke kan omgås); rå Postgres-feil logges serverside og klienten får generisk melding (slug-kollisjon får ett nytt forsøk); admin-passordsjekken er konstant-tid over SHA-256-digester + 300 ms straff ved feil; approve OG delete gir 404 på 0 rader (delete-hullet var udokumentert — arbeideren fant det selv); identity.ts tåler blokkert lagring (Safari privat); dataeksporten samler nå ALT under sundaylicks_-prefikset (v2) så eksport og nullstilling er enige. Ny ren rate-limit-helper m/ egne tester. 344 → 370 tester.


Kreditt-taket drepte alle tre F-arbeiderne ~kl. 08 (F1 nesten ferdig → Fable fullførte/merget; F2 halvveis → Fable løste Practice-konflikten mot #52 og fullførte /ove-, /bla-, cache- og demo-punktene; F4 urørt → relansert etter reset).

## N5 — Rekkverk (ESLint, tester, hygiene) ✅ (PR #56, merget)

- **ESLint fra null** (repoet hadde INGEN linter etter ~40 agent-PR-er): flat config m/ eslint-config-next, `--max-warnings=0`, inn i `npm run check` (= CI-gaten). 49 funn → 0: 5 autofiks (avslørte at 5 av 7 gamle disable-kommentarer ikke undertrykte noe lenger), 9 håndfikser (ubrukte imports/props; PianoRoll hadde en overflødig memo-dep som brøt memoiseringen på 60 Hz-laget), 3 React-Compiler-regler skrudd av med begrunnelse (appen kompileres ikke med React Compiler; egen oppfølgingsoppgave er meldt).
- **+66 tester** på kjernebibliotekene (music.ts m/ 25 importører, transpose.ts, licks.ts fallback/cache) — **mutasjonstestet**: 4 bevisste brekkasjer ga nøyaktig forventet feil. vitest-glob åpnet for `.test.tsx`.
- **Katalog som ikke lyver:** `lib/guitar/` → `lib/fretted/` (BASS_EADG bodde i «guitar»; 9 importører, .ts-endelser bevart), død PathCard.tsx slettet, foreldet backfill-metadata.mjs slettet (stille brukket siden alltid — rot-årsaken til moll-modus-feilen), wrangler compatibility_date 2025-05-05 → 2026-07-01, `.nvmrc`+engines (CI leser nå .nvmrc).
- Seed-grafen BEVIST lastbar under Nodes type-stripping (alle 328 licks validert, ingen DB-tilgang).
- Avvik: generator-scriptene (gen_gitar/gen_bass.py) var alt slettet fra scratchpaden før arkivering — invariantene deres lever i seed-similarity- og fretted-testene.

## Sluttbevis (N6, main `773e5db`)

- `npm run check`: **439 tester grønne + lint rent** (natta startet på 336)
- `npm run cf:build`: grønn. Chunk-profil: 959 KB (Tone.js) | 429 KB (korpus, **lazy** — refereres ikke av noen prerendret HTML) | 291 KB — mot førbildets 982+784 KB i første-last.
- Prod er URØRT hele natta (v`6fb57d35` fra i går kveld ruller fortsatt).

## Venter på eier (morgen)

- [ ] **Deploy** av nattas main (alt er CI-grønt, men kun eier deployer)
- _(øvrig fylles ut)_
