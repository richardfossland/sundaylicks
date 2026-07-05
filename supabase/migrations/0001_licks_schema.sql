-- ============================================================================
-- SundayLicks — database schema  (idempotent: safe to re-run)
--
-- Lives in a dedicated `licks` Postgres schema so it can coexist with the other
-- SundaySuite apps in the SAME shared Supabase project — respecting the
-- free-tier project limit.
--
-- SundayLicks is READ-ONLY in v1: the public `read published` RLS policy is the
-- only access the anon key needs. All writes (curation / seeding / future
-- submissions review) go through the service role via scripts/seed.mjs — never
-- the deployed Worker.
--
-- ⚠️  AFTER running this migration you MUST add `licks` to the project's
--     exposed schemas:  Dashboard → Settings → API → "Exposed schemas" → add
--     `licks` → Save. Without that, PostgREST will not route licks.* calls.
-- ============================================================================

create extension if not exists "pgcrypto";
create schema if not exists licks;

create table if not exists licks.licks (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  name           text not null,
  description    text,
  category       text not null
    check (category in ('turnaround','two-five-one','run','fill','ending','intro')),
  difficulty     smallint not null check (difficulty between 1 and 3),
  original_key   smallint not null check (original_key between 0 and 11),
  default_bpm    smallint not null check (default_bpm between 20 and 300),
  beats          numeric not null check (beats > 0),
  time_signature text not null default '4/4',
  notes          jsonb not null,   -- [{p,t,d,h,v?}]
  chords         jsonb not null,   -- [{t,d,r,q,b?}]
  tags           text[] not null default '{}',
  status         text not null default 'published'
    check (status in ('published','draft','submitted')),
  submitted_by   text,             -- localStorage id for user submissions (fase 4)
  created_at     timestamptz not null default now()
);

create index if not exists licks_category_idx
  on licks.licks (category) where status = 'published';

alter table licks.licks enable row level security;

-- Public read of published licks only.
drop policy if exists "read published" on licks.licks;
create policy "read published" on licks.licks
  for select using (status = 'published');

-- No INSERT/UPDATE/DELETE policies: anon/authenticated cannot write. Curation
-- and seeding use the service role (bypasses RLS) via scripts/seed.mjs.

-- Ensure the API roles can reach the schema + table (RLS still governs rows).
-- anon/authenticated: read only (RLS = published). service_role: full write,
-- since it powers the seed script + the /api/submit + /api/admin write paths.
grant usage on schema licks to anon, authenticated, service_role;
grant select on licks.licks to anon, authenticated;
grant all privileges on licks.licks to service_role;
