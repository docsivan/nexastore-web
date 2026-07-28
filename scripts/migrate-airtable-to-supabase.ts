// Zevio — Airtable to Supabase Migration
// Run: npx tsx scripts/migrate-airtable-to-supabase.ts

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const AIRTABLE_BASE = 'appaVFVbwG9MkoDa9'
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!AIRTABLE_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing environment variables. Check .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function fetchAirtable(table: string): Promise<any[]> {
  const records: any[] = []
  let offset: string | undefined

  do {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(
      table
    )}${offset ? `?offset=${offset}` : ''}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_KEY}` },
    })
    if (!res.ok) throw new Error(`Airtable fetch failed: ${res.status}`)
    const data = await res.json()
    records.push(...(data.records ?? []))
    offset = data.offset
    if (offset) await new Promise((r) => setTimeout(r, 200)) // rate limit
  } while (offset)

  return records
}

async function migrateProducts() {
  console.log('\n📦 Migrating Products...')
  const records = await fetchAirtable('Products')
  console.log(`   Found ${records.length} records in Airtable`)

  const products = records.map((r: any) => ({
    item_code: r.fields.item_code ?? r.fields['Item Code'] ?? r.id,
    sku: r.fields.sku ?? r.fields['SKU'] ?? null,
    name: r.fields.name ?? r.fields['Name'] ?? 'Unnamed Product',
    category: r.fields.category ?? r.fields['Category'] ?? null,
    brand: r.fields.brand ?? r.fields['Brand'] ?? null,
    pack_size: r.fields.pack_size ?? r.fields['Pack Size'] ?? null,
    batch_number: r.fields.batch_number ?? null,
    expiry_date: r.fields.expiry_date ?? null,
    cost_price: parseFloat(r.fields.cost_price ?? r.fields['Cost Price'] ?? 0),
    discount_percent: parseFloat(r.fields.discount_percent ?? 0),
    final_price: parseFloat(r.fields.final_price ?? r.fields['Final Price'] ?? 0),
    stock_quantity: parseInt(r.fields.stock_quantity ?? r.fields['Stock'] ?? 0),
    product_page_url: r.fields.product_page_url ?? null,
    is_active: r.fields.is_active === true || r.fields.is_active === 1 || r.fields['Is Active'] === true,
    display_order: parseInt(r.fields.display_order ?? r.fields['Display Order'] ?? 0),
    haya_featured: r.fields.haya_featured === true,
    haya_badge: r.fields.haya_badge ?? null,
    image_url: Array.isArray(r.fields.image_url)
      ? r.fields.image_url[0]?.url
      : r.fields.image_url ?? null,
  }))

  let success = 0
  let failed = 0

  for (let i = 0; i < products.length; i += 50) {
    const batch = products.slice(i, i + 50)
    const { error } = await supabase
      .from('products')
      .upsert(batch, { onConflict: 'item_code' })
    if (error) {
      console.error(`   ❌ Batch ${Math.floor(i / 50) + 1} failed:`, error.message)
      failed += batch.length
    } else {
      success += batch.length
      console.log(`   ✅ Batch ${Math.floor(i / 50) + 1} — ${batch.length} products inserted`)
    }
    await new Promise((r) => setTimeout(r, 100))
  }

  console.log(`   Result: ${success} success, ${failed} failed`)
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...')
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
  if (error) {
    console.error('   Verification failed:', error.message)
  } else {
    console.log(`   ✅ Products in Supabase: ${count}`)
  }

  const { data: tiers } = await supabase.from('pricing_tiers').select('*')
  console.log(`   ✅ Pricing tiers seeded: ${tiers?.length ?? 0}`)
}

async function main() {
  console.log('🚀 Zevio — Airtable → Supabase Migration')
  console.log('   Supabase:', SUPABASE_URL)
  console.log('   Airtable base:', AIRTABLE_BASE)

  await migrateProducts()
  await verifyMigration()

  console.log('\n🎉 Migration complete!')
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
