-- ============================================================================
-- SundayLicks — add theory metadata to licks. Idempotent, follows the
-- `genre` pattern from 0003_genre.sql: plain constraint-free columns with
-- safe defaults + a partial index on the published set. No RLS/policy/grant
-- changes — reads stay anon/published-only, writes stay service-role-only.
--
-- These columns back the generated-content workstreams (chord-transition
-- drills, AI-assisted licks, etc.):
--   mode              — 'major' | 'minor' (free text, app enumerates the set,
--                        same rationale as genre: avoid a migration per addition)
--   harmonic_function — scale-degree / functional tags for the lick's role in
--                        a progression, e.g. {'ii','V7'} or {'tritone-sub'}
--   kind              — distinguishes plain library licks ('lick', the
--                        default — every existing row keeps this) from other
--                        generated shapes, e.g. 'transition'
-- ============================================================================

alter table licks.licks
  add column if not exists mode text not null default 'major';

alter table licks.licks
  add column if not exists harmonic_function text[] not null default '{}';

alter table licks.licks
  add column if not exists kind text not null default 'lick';

create index if not exists licks_mode_idx
  on licks.licks (mode) where status = 'published';

create index if not exists licks_kind_idx
  on licks.licks (kind) where status = 'published';
