-- ============================================================================
-- SundayLicks — add `instrument` to licks. Idempotent, follows the `genre` /
-- theory-metadata pattern (0003/0004): a plain constraint-free text column with
-- a safe default + a partial index on the published set. No RLS/policy/grant
-- changes — reads stay anon/published-only, writes stay service-role-only.
--
-- Additivt og bakoverkompatibelt: hver eksisterende rad får 'piano', så en
-- gammel klient (før gitar-visningen) er upåvirket. Fritekst (ikke enum/CHECK)
-- med samme rasjonale som `genre`/`mode`: appen enumererer det kjente settet
-- ('piano' | 'gitar') og vi slipper en migrasjon per fremtidig instrument.
-- ============================================================================

alter table licks.licks
  add column if not exists instrument text not null default 'piano';

create index if not exists licks_instrument_idx
  on licks.licks (instrument) where status = 'published';
