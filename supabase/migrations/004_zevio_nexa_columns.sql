-- ============================================
-- ZEVIO — Migration 004
-- Column gaps found while migrating the nexa/* analyst routes.
-- All changes are additive.
-- ============================================

-- app/api/nexa/clarity marks CRO rows once an insight has been generated
-- from them, so the same signal is not analysed twice.
alter table ai_cro add column if not exists insight_generated boolean default false;

create index if not exists idx_ai_cro_generated on ai_cro(insight_generated, created_at desc);
