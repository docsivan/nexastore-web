-- ============================================
-- ZEVIO — Migration 003
-- Schema gaps found while migrating the P1 (admin) and P2 (nexa /
-- intelligence) route batches off Airtable. All changes are additive.
--
-- Table name mapping for reference — these all already exist:
--   Haya_Trends         -> ai_trends
--   Haya_Search_Console -> ai_search_console
--   Nexa_CRO            -> ai_cro
--   Haya_Promotions     -> ai_promotions
--   Haya_Citations      -> ai_citations
--
-- Note on ai_insights.priority: deliberately left as `text`. The AI routes
-- write both numeric-as-string ('1','2','3') and words ('medium'), so text is
-- the only type that tolerates both.
-- ============================================

-- Store_Config — the only genuinely new table in this batch.
-- app/api/admin/language reads/writes a single 'second_language' row.
create table if not exists store_config (
  id uuid default gen_random_uuid() primary key,
  config_key text unique not null,
  config_value text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

insert into store_config (config_key, config_value)
values ('second_language', 'none')
on conflict (config_key) do nothing;

-- Admin_Users — backs lib/admin-users.ts (admin login, roles, password resets)
create table if not exists admin_users (
  id uuid default gen_random_uuid() primary key,
  name text,
  email text unique not null,
  role text default 'staff',
  password_hash text,
  must_change_password boolean default true,
  is_active boolean default true,
  last_login timestamptz,
  created_at timestamptz default now()
);

-- ai_insights — app/api/admin/insights and the nexa/* writers
alter table ai_insights add column if not exists insight_id text;
alter table ai_insights add column if not exists package text;
alter table ai_insights add column if not exists body text;
alter table ai_insights add column if not exists data_window text;

-- ai_promotions — app/api/admin/promotions
alter table ai_promotions add column if not exists promo_id text;
alter table ai_promotions add column if not exists promo_discount decimal(5,2);
alter table ai_promotions add column if not exists original_discount decimal(5,2);
alter table ai_promotions add column if not exists approved_by text;

-- ai_trends — app/api/intelligence/seo sorts on trend_score
alter table ai_trends add column if not exists trend_score decimal(6,2);

-- ai_cro — app/api/nexa/cro
alter table ai_cro add column if not exists session_count integer default 0;
alter table ai_cro add column if not exists data_window text;

-- ai_citations — app/api/nexa/citations
-- migration 001 named the timestamp checked_at; the route writes fetched_at.
alter table ai_citations add column if not exists position decimal(6,2);
alter table ai_citations add column if not exists context text;
alter table ai_citations add column if not exists source text;
alter table ai_citations add column if not exists fetched_at timestamptz default now();

-- ai_log — app/api/admin/nexa-log sorts on timestamp, already present in 001.
-- Index it so the admin log view stays fast as the table grows.
create index if not exists idx_ai_log_timestamp on ai_log(timestamp desc);
create index if not exists idx_ai_insights_created on ai_insights(created_at desc);
create index if not exists idx_store_config_key on store_config(config_key);
create index if not exists idx_admin_users_email on admin_users(email);
