# Lyd-attribusjon

SundayLicks spiller alt som MIDI-lignende data (aldri lyd-opptak av licks). To av
instrumentene bruker likevel korte sampler av enkeltnoter for klangen; kildene og
lisensene deres er listet under. El-piano og Pad er rent syntetisert i appen og
har ingen eksterne kilder.

## Piano — Salamander Grand (Tone.js-CDN)

- **Kilde:** Salamander Grand Piano V3, subset servert fra Tone.js sitt
  audio-repo (`tonejs.github.io/audio/salamander/`). Én sample per liten ters,
  A0–C8; Tone.Sampler pitch-shifter mellom dem. Lastes fra CDN ved bruk.
- **Lisens:** Creative Commons Attribution 3.0 (CC-BY 3.0) — Alexander Holm.

## Gitar — `gitar/` (10 filer, ~1,64 MB, self-hostet)

- **Kilde:** `guitar-acoustic`-settet fra **nbrosowsky/tonejs-instruments**
  (opprinnelig innspillinger fra University of Iowa Electronic Music Studios).
  Liten-ters-subset A2–C5; Tone.Sampler ekstrapolerer opp/ned mellom samplene.
- **Lisens:** Creative Commons Attribution 3.0 (CC-BY 3.0).
- Filnavnene er uendret fra kilden.

## Bass — `bass/` (10 filer, ~3,25 MB, self-hostet)

- **Kilde:** `bass-electric`-settet fra **nbrosowsky/tonejs-instruments**.
  El-bass-subset E1–G3 (native prøvenett E/G/A#/C#); Tone.Sampler ekstrapolerer
  opp/ned mellom samplene.
- **Lisens:** Creative Commons Attribution 3.0 (CC-BY 3.0).
- Filnavnene er uendret fra kilden.

## El-piano og Pad

- Syntetisert lokalt i appen (FM-syntese / fatsawtooth-flate). Ingen samples,
  ingen eksterne kilder, ingen attribusjonskrav.

---

Sist oppdatert: 2026-07-14.
