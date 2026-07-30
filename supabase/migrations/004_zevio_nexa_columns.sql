-- ============================================
-- ZEVIO — Migration 004
-- Column gaps found while migrating the nexa/* analyst routes.
-- All changes are additive.
-- ============================================

-- app/api/nexa/clarity marks CRO rows once an insight has been generated
-- from them, so the same signal is not analysed twice.
alter table ai_cro add column if not exists insight_generated boolean default false;

create index if not exists idx_ai_cro_generated on ai_cro(insight_generated, created_at desc);

-- app/api/nexa/trends writes a much richer row than migration 001's ai_trends
-- (keyword / interest_score / region / date). `topic` is the upsert key.
alter table ai_trends add column if not exists topic text;
alter table ai_trends add column if not exists category text;
alter table ai_trends add column if not exists trend_value decimal(10,2);
alter table ai_trends add column if not exists trend_direction text;
alter table ai_trends add column if not exists week_over_week_change decimal(10,2);
alter table ai_trends add column if not exists geo text;
alter table ai_trends add column if not exists related_queries text;
alter table ai_trends add column if not exists rising_queries text;
alter table ai_trends add column if not exists weekly_data text;
alter table ai_trends add column if not exists content_written boolean default false;
alter table ai_trends add column if not exists fetched_at date;

create index if not exists idx_ai_trends_topic on ai_trends(topic, fetched_at desc);

-- app/api/nexa/gsc upserts Search Console rows keyed on (query, data_range).
-- migration 001's ai_search_console had query/page/clicks/impressions/ctr/
-- position/date only.
alter table ai_search_console add column if not exists page_url text;
alter table ai_search_console add column if not exists opportunity_score integer;
alter table ai_search_console add column if not exists content_exists boolean default false;
alter table ai_search_console add column if not exists data_range text;
alter table ai_search_console add column if not exists fetched_at timestamptz;

create index if not exists idx_ai_gsc_query on ai_search_console(query, data_range);

-- app/api/nexa/citations tags which analyst produced an insight.
alter table ai_insights add column if not exists source text;

-- products.description: written by app/api/nexa/cro (conversion rewrites) and
-- read by lib/ai-context for the chat prompt. Migration 001 only had
-- description_ar, so the English description had nowhere to live.
alter table products add column if not exists description text;
