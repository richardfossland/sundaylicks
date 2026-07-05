# SundayLicks

Interaktiv øvingsapp for gospel-/lovsang-licks på piano. Kuratert bibliotek med
MIDI-basert avspilling, opplyst klaviatur, live tempo- og toneartskontroll.
Del av Sunday-suiten.

**Kjerneprinsipp:** alt lagres som MIDI-data (noter + metadata), aldri som lyd.
Tempo og transponering er derfor rene tallendringer — ingen time-stretching,
ingen pitch-shifting, ingen artefakter.

## Stack

- **Next.js 16** (App Router) på **Cloudflare Workers** via OpenNext (som resten
  av suiten — `licks.sundaysuite.app`).
- **Supabase** (Postgres), egen `licks`-schema i det delte suite-prosjektet.
- **Tone.js** + Salamander-samples (`Tone.Sampler`) for ekte pianolyd.
- **Tailwind 4**, Fraunces (display) + Instrument Sans (UI).

## Kom i gang

```bash
npm install
cp .env.local.example .env.local   # fyll inn Supabase URL + anon key
npm run dev
```

Appen fungerer også **uten** Supabase: `src/data/seed-licks.ts` er sannhetskilden
og brukes som fallback når databasen ikke er konfigurert eller er tom.

## Database

1. Kjør `supabase/migrations/0001_licks_schema.sql` i Supabase-prosjektet.
2. **Eksponer schemaet:** Dashboard → Settings → API → Exposed schemas → legg til
   `licks` → Save.
3. Seed de kuraterte lickene (krever `SUPABASE_SERVICE_ROLE_KEY` i `.env.local`):
   ```bash
   npm run seed
   ```

`seed`-scriptet validerer all notedata med zod (`src/lib/validation.ts`) før
upsert. Service-role brukes kun lokalt — aldri i den deployede Workeren.

## Deploy (Cloudflare)

```bash
# NEXT_PUBLIC_* må stå i .env.local FØR bygg (bakes inn ved build).
npm run cf:deploy
```

## Datamodell

Se `src/types/lick.ts`. Kort:

- `notes`: `[{ p, t, d, h, v? }]` — MIDI-tone, start (slag), varighet (slag),
  hånd (`L`/`R`), valgfri velocity.
- `chords`: `[{ t, d, r, q, b? }]` — start, varighet, grunntone (pitch class
  0–11), kvalitet (`''`, `m7`, `7`, `maj7`, `m`, `sus4` …), valgfri basstone.

## Status

Fase 1 (MVP): bibliotek + øvingsvisning med sampler-avspilling, opplyst
klaviatur, live tempo (40–180), transponering til alle 12 tonearter, loop,
håndseparasjon, akkordskjema og pianorull. Notasjon (VexFlow), øvemodus med
økende tempo og Web MIDI-input kommer i fase 2–3.
