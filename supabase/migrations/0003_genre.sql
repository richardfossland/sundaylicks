-- ============================================================================
-- SundayLicks — add `genre` to licks. Idempotent.
--
-- Existing rows default to 'gospel'; the seed script then upserts each lick with
-- its real genre. Genre is plain text (no enum constraint) so new genres can be
-- added later without another migration — the app/editor enumerate the known set.
-- ============================================================================

alter table licks.licks
  add column if not exists genre text not null default 'gospel';

create index if not exists licks_genre_idx
  on licks.licks (genre) where status = 'published';

-- The bigger library also added two categories (comp, groove). Widen the check.
alter table licks.licks drop constraint if exists licks_category_check;
alter table licks.licks add constraint licks_category_check
  check (category in ('turnaround','two-five-one','run','fill','ending','intro','comp','groove'));
