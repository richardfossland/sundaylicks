-- ============================================================================
-- SundayLicks — Fase 4 (user submissions). Idempotent.
--
-- NO RLS CHANGE: submissions and moderation are written by the SERVICE ROLE via
-- server routes (/api/submit, /api/admin/licks), which bypass RLS. Anon stays
-- read-published-only. The `submitted` status and `submitted_by` column already
-- exist from 0001; this migration only adds an index for the admin queue.
-- ============================================================================

create index if not exists licks_submitted_idx
  on licks.licks (created_at) where status = 'submitted';
