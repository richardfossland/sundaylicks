# SundayLicks — utrullingsguide (eier)

Alle steg kjøres fra prosjektmappa med mindre annet står:

```bash
cd "~/Documents/Claude/Claude Code/sunday-suite/sundaylicks"
```

Rekkefølgen betyr noe: **migrasjon → eksponer schema → seed → deploy → secrets → verifiser.**

---

## A. Velg Supabase-prosjekt og hent nøkler
SundayLicks er sesjonsløs og leser bare — den bor i sitt eget `licks`-schema og
kan dele prosjekt med de andre spill-appene (harvest/market/quiz/basar).

1. Åpne Supabase-dashboardet → velg det delte SundaySuite-prosjektet.
2. **Settings → API**, noter:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** nøkkel → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** nøkkel (hemmelig!) → `SUPABASE_SERVICE_ROLE_KEY`

## B. Kjør migrasjonene (SQL editor)
I Supabase → **SQL Editor** → kjør innholdet i disse to filene, i rekkefølge:
1. `supabase/migrations/0001_licks_schema.sql`
2. `supabase/migrations/0002_submissions.sql`

(Begge er idempotente — trygge å kjøre om igjen.)

## C. Eksponer `licks`-schemaet
**Settings → API → Exposed schemas** → legg til `licks` → **Save**.
Uten dette rutes ikke `licks.*`-kall (PostgREST ignorerer skjemaet).

## D. Lag `.env.local`
```bash
cp .env.local.example .env.local
```
Fyll inn de fire verdiene fra steg A:
```
NEXT_PUBLIC_SUPABASE_URL=https://…supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
NEXT_PUBLIC_APP_URL=https://licks.sundaysuite.app
SUPABASE_SERVICE_ROLE_KEY=…            # brukes av seed + skrive-ruter
ADMIN_PASSWORD=<velg-et-sterkt-passord> # brukes lokalt; settes også som Worker-secret senere
```
`.env.local` er git-ignorert — den committes aldri.

## E. Seed de 20 kuraterte lickene
```bash
npm install       # hvis du ikke har gjort det
npm run seed
```
Forventet: `✓ Seedet 20 licks til licks.licks`. (Krever Node ≥ 22 — bruker
innebygd TypeScript-stripping til å lese seed-dataene.)

## F. Test lokalt
```bash
npm run dev        # http://localhost:3000
```
- Biblioteket skal vise **20 licks fra databasen** (ikke fallback).
- Åpne en lick → spill av, transponér, bytt noter/øvemodus.
- `/submit` → bygg en test-lick → **Send inn**. Skal si «Takk! …» (fordi
  `SUPABASE_SERVICE_ROLE_KEY` er satt lokalt).
- `/admin` → logg inn med `ADMIN_PASSWORD` → du ser test-innsendingen →
  **Godkjenn** → den dukker opp i biblioteket.

## G. Deploy til Cloudflare
`NEXT_PUBLIC_*` bakes inn ved bygg, så `.env.local` **må** være fylt ut først.
```bash
npx wrangler login     # første gang, hvis ikke allerede innlogget
npm run cf:deploy      # opennextjs-cloudflare build && deploy
```
Worker-navn: `sundaylicks`, rute: `licks.sundaysuite.app` (custom domain).
Første gang kan DNS/sertifikat bruke ~10–15 min før domenet svarer.

## H. Sett Worker-secrets (nødvendig for Fase 4 — innsending + admin)
Etter første deploy finnes Workeren. Secrets er **per-Worker**:
```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # lim inn service_role-nøkkelen
npx wrangler secret put ADMIN_PASSWORD              # lim inn admin-passordet
```
Uten disse svarer `/submit` og `/admin` **503** — lesing/øving fungerer likevel.
(URL-en er allerede bakt inn ved bygg, så bare disse to trengs som secrets.)

## I. Verifiser live
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://licks.sundaysuite.app/
```
- Forsiden `200`, 20 licks synlige.
- En lick spiller av med sampler-lyd.
- `/submit` → send inn → `/admin` (passord) → godkjenn → dukker opp i biblioteket.

## J. Valgfritt
- **Git-remote:** repoet er lokalt (4 commits). Si fra så pusher jeg til
  `github.com/richardfossland/sundaylicks` (privat) — eller opprett remote selv:
  `git remote add origin … && git push -u origin main`.
- **Nettside-verktøykasse:** legg SundayLicks-kort i `sundaysuite-website`
  (samme mønster som SundayTicTacToe-oppføringen).

---

### Feilsøking
- **Biblioteket viser bare 5 licks / fallback:** `licks`-schema ikke eksponert
  (steg C) eller seed ikke kjørt (steg E).
- **`cf:deploy` → «wrangler not found»:** kjør `npm install` i mappa.
- **`/submit` → 503 i prod:** `SUPABASE_SERVICE_ROLE_KEY`-secret mangler (steg H).
- **`/admin` → «ikke konfigurert» (503):** `ADMIN_PASSWORD`-secret mangler (steg H).
- **Prod-DDL kan ikke kjøres headless herfra** (access-token i keychain, intet
  DB-passord) — derfor kjører *du* migrasjonene i SQL-editoren (steg B).
