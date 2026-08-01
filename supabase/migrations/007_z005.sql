-- ============================================
-- ZEVIO Migration 007 — Z-005
-- August 1, 2026
--
-- IMPORTANT: four of the six tables in the Z-005 brief ALREADY EXIST from
-- migrations 002/003, with different column names. `create table if not
-- exists` silently no-ops on those, which would leave the CSV importer
-- writing to columns that do not exist. This file therefore pairs each
-- create with the ALTERs needed to reconcile the live schema.
--
-- Deliberately NOT included:
--   banners   — per Z-005 override "NO BANNERS TABLE". The table already
--               exists from migration 002 and app/api/admin/banners is wired
--               to it with verified CRUD, so it is left untouched, not dropped.
--   cron_log  — per Z-005 override "SKIP Haya_Cron_Log".
-- ============================================


-- ── 1. disclaimers — ALREADY EXISTS (migration 002) ──────────────────
-- Live columns: id, session_id, question, accepted_at, customer_phone,
--               customer_name, ip_address, user_agent, created_at
-- The Z-005 shape adds customer_id, phone and disclaimer_version.
create table if not exists disclaimers (
  id uuid default gen_random_uuid() primary key,
  customer_id text,
  phone text,
  accepted_at timestamptz default now(),
  disclaimer_version text,
  ip_address text
);

alter table disclaimers add column if not exists customer_id text;
alter table disclaimers add column if not exists phone text;
alter table disclaimers add column if not exists disclaimer_version text;


-- ── 2. admin_users — ALREADY EXISTS (migration 003) ──────────────────
-- Live schema is a superset of the Z-005 shape (it also carries
-- password_hash, must_change_password and last_login, which lib/admin-users.ts
-- depends on for admin login). No changes required — the create below is a
-- no-op and is kept only so this file matches the brief.
create table if not exists admin_users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  role text default 'admin',
  name text,
  is_active boolean default true,
  created_at timestamptz default now()
);


-- ── 3. store_config — ALREADY EXISTS (migration 003) ─────────────────
-- Live columns are config_key / config_value, NOT key / value.
-- app/api/admin/language reads and writes config_key/config_value, so those
-- stay canonical; renaming them would break a working route for no gain.
-- The CSV importer maps key -> config_key and value -> config_value.
-- Only `description` is genuinely new.
create table if not exists store_config (
  id uuid default gen_random_uuid() primary key,
  key text unique not null,
  value text,
  description text,
  updated_at timestamptz default now()
);

alter table store_config add column if not exists description text;


-- ── 4. haya_social — genuinely new ───────────────────────────────────
create table if not exists haya_social (
  id uuid default gen_random_uuid() primary key,
  platform text,
  content text,
  status text default 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz default now()
);


-- ── 5. haya_waitlist — new; supersedes the empty `waitlist` table ─────
-- `waitlist` exists from migration 002 with 0 rows and is currently written
-- by app/api/waitlist. That route will be repointed here so there is a single
-- waitlist table; the empty original is left orphaned rather than dropped.
-- Columns beyond the brief (lang, signed_up_at) preserve what that route writes.
create table if not exists haya_waitlist (
  id uuid default gen_random_uuid() primary key,
  name text,
  email text,
  phone text,
  source text,
  language text default 'en',
  status text default 'pending',
  created_at timestamptz default now()
);

alter table haya_waitlist add column if not exists lang text default 'en';
alter table haya_waitlist add column if not exists signed_up_at date default current_date;


-- ── 6. haya_conversations — new; supersedes the empty `conversations` ─
-- `conversations` exists from migration 002 with 0 rows and is written by
-- app/api/chat/save and read by app/api/nexa/analyse. Those will be repointed
-- here. The extra columns below are what that existing code requires —
-- without them, repointing would break the chat-analysis flow.
create table if not exists haya_conversations (
  id uuid default gen_random_uuid() primary key,
  session_id text,
  customer_id text,
  messages jsonb,
  summary text,
  sentiment text,
  created_at timestamptz default now()
);

alter table haya_conversations add column if not exists customer_name text;
alter table haya_conversations add column if not exists phone text;
alter table haya_conversations add column if not exists clinic_name text;
alter table haya_conversations add column if not exists page_url text;
alter table haya_conversations add column if not exists transcript text;
alter table haya_conversations add column if not exists message_count integer default 0;
alter table haya_conversations add column if not exists intent_summary text;
alter table haya_conversations add column if not exists outcome text;
alter table haya_conversations add column if not exists language text default 'en';
alter table haya_conversations add column if not exists analysed boolean default false;


-- ── INDEXES ──────────────────────────────────────────────────────────
create index if not exists idx_admin_users_email on admin_users(email);
create index if not exists idx_store_config_key on store_config(config_key);
create index if not exists idx_haya_waitlist_email on haya_waitlist(email);
create index if not exists idx_haya_conversations_session on haya_conversations(session_id);
create index if not exists idx_haya_conversations_analysed on haya_conversations(analysed, created_at desc);
create index if not exists idx_haya_social_status on haya_social(status, scheduled_at);
create index if not exists idx_disclaimers_customer on disclaimers(customer_id);
