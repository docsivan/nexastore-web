-- ============================================
-- ZEVIO — Migration 005
-- Two schema defects in migration 001, found by exercising the nexa analyst
-- routes end to end. Both caused silent write failures: the routes returned
-- HTTP 200 because these writes are fire-and-forget, while every insert was
-- rejected by Postgres.
-- ============================================

-- DEFECT 1 — ai_insights.action_required was declared boolean.
-- Every AI route writes a sentence into it, e.g.
--   "Apply a 30% discount to clear stock and maintain a 50% margin"
-- and app/api/admin/insights reads it back with String(...).
-- Postgres rejected all 30 inserts with:
--   22P02 invalid input syntax for type boolean
alter table ai_insights alter column action_required drop default;
alter table ai_insights alter column action_required type text
  using action_required::text;

-- DEFECT 2 — ai_seo has no created_at column.
-- Migration 001 gave it `last_updated date` instead, but every other ai_*
-- table has created_at, and it is the natural default sort key. Reads failed
-- with: 42703 column ai_seo.created_at does not exist
-- That failure then cascaded: the lookup returned empty, so the caller took
-- the "create" branch and hit a duplicate key on the unique item_code.
alter table ai_seo add column if not exists created_at timestamptz default now();

create index if not exists idx_ai_seo_created on ai_seo(created_at desc);
