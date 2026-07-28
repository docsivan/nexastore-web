// Quick census of every Zevio Supabase table. Reports MISSING for tables
// that migration 002 has not created yet.
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TABLES = [
  'products', 'orders', 'customers', 'pricing_tiers',
  'ai_memory', 'ai_insights', 'ai_log', 'ai_seo', 'ai_content',
  'ai_search_console', 'ai_trends', 'ai_cro', 'ai_reviews',
  'ai_promotions', 'ai_citations',
  // migration 002
  'banners', 'waitlist', 'conversations', 'cron_log', 'disclaimers',
]

async function main() {
  for (const t of TABLES) {
    // head:true returns count null (not an error) for a missing table,
    // so probe with a real select to tell "missing" from "empty".
    const probe = await sb.from(t).select('*').limit(1)
    if (probe.error) {
      console.log(t.padEnd(20), '❌ MISSING')
      continue
    }
    const { count } = await sb.from(t).select('*', { count: 'exact', head: true })
    console.log(t.padEnd(20), `${count ?? 0} rows`)
  }
}

main().catch(console.error)
