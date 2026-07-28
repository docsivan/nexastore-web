-- ============================================
-- ZEVIO — Migration 002
-- The 5 Airtable tables that had no home in migration 001.
-- Field shapes derived from the existing route handlers, so the
-- Airtable -> Supabase cutover for those routes is a like-for-like swap.
-- ============================================

-- Banners  (app/api/admin/banners/route.ts — BannerFields)
create table if not exists banners (
  id uuid default gen_random_uuid() primary key,
  title text,
  subtitle text,
  cta_text text,
  cta_url text,
  is_active boolean default true,
  display_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Haya_Waitlist  (app/api/waitlist/route.ts)
create table if not exists waitlist (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  phone text,
  source text,
  signed_up_at date default current_date,
  lang text default 'en',
  status text default 'new',
  created_at timestamptz default now()
);

-- Haya_Conversations  (app/api/chat/save + app/api/nexa/analyse)
create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  session_id text,
  customer_id text,
  customer_name text,
  phone text,
  clinic_name text,
  page_url text,
  transcript text,
  message_count integer default 0,
  intent_summary text,
  outcome text,
  language text default 'en',
  -- nexa/analyse filters on analysed = false over the last 7 days
  analysed boolean default false,
  created_at timestamptz default now()
);

-- Haya_Cron_Log  (app/api/admin/cron/{badges,display-order,translate})
create table if not exists cron_log (
  id uuid default gen_random_uuid() primary key,
  cron_name text,
  status text,
  records_processed integer default 0,
  error_message text,
  run_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Disclaimers  (lib/airtable.ts DisclaimerFields)
-- Currently shimmed into ai_log by lib/supabase.ts createDisclaimerLog();
-- this gives it a proper home so consent records are queryable on their own.
create table if not exists disclaimers (
  id uuid default gen_random_uuid() primary key,
  session_id text,
  question text,
  accepted_at timestamptz default now(),
  customer_phone text,
  customer_name text,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

-- INDEXES
create index if not exists idx_banners_active on banners(is_active, display_order);
create index if not exists idx_waitlist_email on waitlist(email);
create index if not exists idx_conversations_session on conversations(session_id);
create index if not exists idx_conversations_analysed on conversations(analysed, created_at desc);
create index if not exists idx_cron_log_name on cron_log(cron_name, run_at desc);
create index if not exists idx_disclaimers_session on disclaimers(session_id);
