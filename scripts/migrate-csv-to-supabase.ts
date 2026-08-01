/**
 * Zevio — Airtable CSV → Supabase migration (Z-005)
 * Run: npx tsx scripts/migrate-csv-to-supabase.ts
 *
 * Handles 8 tables. Every column that is renamed or dropped is logged, so the
 * mapping decisions are auditable rather than buried in code.
 *
 * Not migrated, by instruction: Products (already live), Banners, Haya_Cron_Log.
 */

import fs from 'fs'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/** Only this address may hold super_admin. Enforced at import time. */
const SUPER_ADMIN_EMAIL = 'docsivan@gmail.com'

// ── CSV parsing (RFC 4180: quoted fields, escaped quotes, embedded newlines) ──
// orders.items holds JSON containing commas, so a naive split would corrupt it.

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else field += c
      continue
    }
    if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\r') { /* handled by \n */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

function readCsv(path: string): Record<string, string>[] {
  if (!fs.existsSync(path)) {
    console.warn(`   ⚠️  ${path} not found — skipping`)
    return []
  }
  // Strip the UTF-8 BOM Airtable puts on the header row
  const raw = fs.readFileSync(path, 'utf8').replace(/^﻿/, '')
  const rows = parseCsv(raw).filter(r => r.some(c => c.trim().length))
  if (rows.length < 2) return []
  const header = rows[0].map(h => h.trim())
  return rows.slice(1).map(r => {
    const o: Record<string, string> = {}
    header.forEach((h, i) => { o[h] = (r[i] ?? '').trim() })
    return o
  })
}

// ── coercion ──────────────────────────────────────────────────────────
const str = (v?: string) => { const s = (v ?? '').trim(); return s.length ? s : null }
const num = (v?: string, d: number | null = null) => {
  const s = (v ?? '').trim(); if (!s) return d
  const n = Number(s.replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : d
}
const int = (v?: string, d: number | null = null) => { const n = num(v, null); return n === null ? d : Math.round(n) }
const bool = (v?: string) => {
  const s = (v ?? '').trim().toLowerCase()
  return s === 'checked' || s === 'true' || s === '1' || s === 'yes'
}
const json = (v?: string) => { try { return JSON.parse(v || '[]') } catch { return [] } }

/**
 * orders.items in the Airtable export is a human-readable summary, not JSON:
 *   "DEN-001 x10, DEN-002 x10, DEN-003 x5"
 * Parse it into real line items, enriching name and price from the products
 * table so downstream analytics (top-sellers, velocity, CFO) have usable data.
 * Falls back to JSON.parse for any row that genuinely holds JSON.
 */
function parseItemsSummary(
  raw: string | undefined,
  index: Map<string, { name: string; final_price: number }>
): Array<Record<string, unknown>> {
  const v = (raw ?? '').trim()
  if (!v) return []
  if (v.startsWith('[') || v.startsWith('{')) {
    try { return JSON.parse(v) } catch { /* fall through */ }
  }
  const out: Array<Record<string, unknown>> = []
  for (const part of v.split(',')) {
    const m = part.trim().match(/^(\S+)\s*[x×]\s*(\d+)$/i)
    if (!m) continue
    const item_code = m[1]
    const quantity = parseInt(m[2], 10)
    const p = index.get(item_code)
    out.push({
      item_code,
      quantity,
      name:        p?.name ?? item_code,
      final_price: p?.final_price ?? 0,
    })
  }
  return out
}

/** item_code -> { name, final_price } for enriching parsed line items. */
async function buildProductIndex() {
  const index = new Map<string, { name: string; final_price: number }>()
  const { data } = await supabase.from('products').select('item_code,name,final_price')
  for (const r of data ?? []) {
    index.set(String(r.item_code), { name: String(r.name ?? ''), final_price: Number(r.final_price ?? 0) })
  }
  return index
}
/** Airtable exports blank dates as ''; a date/timestamptz column needs null. */
const date = (v?: string) => str(v)

// ── reporting ─────────────────────────────────────────────────────────
const mappings: string[] = []
const dropped: string[] = []
const results: Array<{ table: string; ok: number; failed: number; note?: string }> = []

function mapNote(table: string, from: string, to: string) { mappings.push(`   ${table}: ${from} → ${to}`) }
function dropNote(table: string, cols: string[]) { if (cols.length) dropped.push(`   ${table}: ${cols.join(', ')}`) }

async function push(table: string, rows: Record<string, unknown>[], onConflict?: string, note?: string) {
  if (!rows.length) { results.push({ table, ok: 0, failed: 0, note: 'no rows in CSV' }); return }
  let ok = 0, failed = 0
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50)
    const q = onConflict
      ? supabase.from(table).upsert(batch, { onConflict })
      : supabase.from(table).insert(batch)
    const { error } = await q
    if (error) { console.error(`   ❌ ${table} batch ${Math.floor(i / 50) + 1}: ${error.message}`); failed += batch.length }
    else ok += batch.length
  }
  results.push({ table, ok, failed, note })
  console.log(`   ${failed ? '⚠️ ' : '✅'} ${table}: ${ok} imported${failed ? `, ${failed} failed` : ''}`)
}

// ── migrations ────────────────────────────────────────────────────────

async function migrateOrders() {
  console.log('\n📦 orders')
  const rows = readCsv('scripts/orders-export.csv')
  dropNote('orders', ['Customers', 'Disclaimers'].filter(c => rows[0] && c in rows[0]))
  const productIndex = await buildProductIndex()
  mapNote('orders', 'items ("CODE xQTY, ..." summary)', 'items (jsonb line items, priced from products)')
  await push('orders', rows.map(r => ({
    order_id:         str(r.order_id) ?? `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    created_at:       date(r.created_at),
    customer_name:    str(r.customer_name),
    clinic_name:      str(r.clinic_name),
    phone:            str(r.phone),
    email:            str(r.email),
    address:          str(r.address),
    city:             str(r.city),
    items:            parseItemsSummary(r.items, productIndex),
    subtotal:         num(r.subtotal, 0),
    delivery_charge:  num(r.delivery_charge, 0),
    total:            num(r.total, 0),
    payment_status:   str(r.payment_status) ?? 'pending',
    delivery_status:  str(r.delivery_status) ?? 'pending',
    payment_reference: str(r.payment_reference),
    notes:            str(r.notes),
  })), 'order_id')
}

async function migrateCustomers() {
  console.log('\n👥 customers')
  const rows = readCsv('scripts/customers-export.csv')
  dropNote('customers', ['orders', 'Disclaimers'].filter(c => rows[0] && c in rows[0]))
  mapNote('customers', 'addresses (JSON string)', 'addresses (jsonb)')
  await push('customers', rows.map((r, i) => ({
    customer_id:       str(r.customer_id) ?? `CUST-IMPORT-${i + 1}`,
    customer_name:     str(r.customer_name),
    clinic_name:       str(r.clinic_name),
    phone:             str(r.phone),
    email:             str(r.email),
    address:           str(r.address),
    city:              str(r.city),
    last_order_date:   date(r.last_order_date),
    total_orders:      int(r.total_orders, 0),
    total_spent:       num(r.total_spent, 0),
    preferred_channel: str(r.preferred_channel),
    notes:             str(r.notes),
    password_hash:     str(r.password_hash),
    addresses:         r.addresses ? json(r.addresses) : null,
  })), 'customer_id')
}

async function migrateDisclaimers() {
  console.log('\n📄 disclaimers')
  const rows = readCsv('scripts/disclaimers-export.csv')
  dropNote('disclaimers', ['Order Link', 'Customer Link', 'Acceptance Method', 'Notes'].filter(c => rows[0] && c in rows[0]))
  mapNote('disclaimers', 'customer_phone', 'customer_phone + phone (both populated)')
  await push('disclaimers', rows.map(r => ({
    session_id:     str(r.session_id),
    question:       str(r.question),
    accepted_at:    date(r.accepted_at),
    customer_phone: str(r.customer_phone),
    phone:          str(r.customer_phone),
    customer_name:  str(r.customer_name),
    ip_address:     str(r.ip_address),
    user_agent:     str(r.user_agent),
  })))
}

async function migrateAdminUsers() {
  console.log('\n🔐 admin_users')
  const rows = readCsv('scripts/admin-users-export.csv')
  dropNote('admin_users', ['failed_attempts', 'locked_until', 'reset_otp', 'reset_otp_expiry'].filter(c => rows[0] && c in rows[0]))

  const mapped: Record<string, unknown>[] = []
  for (const r of rows) {
    const email = (str(r.email) ?? '').toLowerCase()
    if (!email) continue
    // HARD RULE: super_admin is reserved for one address; nothing else gets it.
    let role = str(r.role) ?? 'admin'
    if (role.toLowerCase() === 'super_admin' && email !== SUPER_ADMIN_EMAIL) {
      console.warn(`   🔒 ${email} had role super_admin in CSV — downgraded to admin (reserved for ${SUPER_ADMIN_EMAIL})`)
      role = 'admin'
    }
    if (email === SUPER_ADMIN_EMAIL) role = 'super_admin'
    mapped.push({
      email,
      role,
      name:          str(r.name),
      password_hash: str(r.password_hash),
      is_active:     r.is_active === '' ? true : bool(r.is_active),
      last_login:    date(r.last_login),
    })
  }
  await push('admin_users', mapped, 'email')
}

async function migrateStoreConfig() {
  console.log('\n⚙️  store_config')
  const rows = readCsv('scripts/store-config-export.csv')
  mapNote('store_config', 'config_key/config_value', 'config_key/config_value (live schema — no rename)')
  await push('store_config', rows.map(r => ({
    config_key:   str(r.config_key),
    config_value: str(r.config_value),
  })).filter(r => r.config_key), 'config_key')
}

async function migrateHayaSocial() {
  console.log('\n📱 haya_social')
  const rows = readCsv('scripts/haya-social-export.csv')
  // The CSV is wide (one row per day, one column per platform); the table is
  // long (one row per platform post). Explode each row into its non-empty posts.
  mapNote('haya_social', 'wide (5 platform columns)', 'long (one row per platform)')
  dropNote('haya_social', ['pillar', 'theme', 'waitlist_count_at_post'].filter(c => rows[0] && c in rows[0]))

  const PLATFORMS: Array<[string, string]> = [
    ['instagram_caption', 'instagram'],
    ['facebook_post', 'facebook'],
    ['linkedin_post', 'linkedin'],
    ['google_business_post', 'google_business'],
    ['twitter_post', 'twitter'],
  ]
  const out: Record<string, unknown>[] = []
  for (const r of rows) {
    for (const [col, platform] of PLATFORMS) {
      const content = str(r[col])
      if (!content) continue
      out.push({
        platform,
        content,
        status:       str(r.status) ?? 'draft',
        scheduled_at: date(r.date),
      })
    }
  }
  await push('haya_social', out, undefined, `${rows.length} CSV row(s) → ${out.length} platform posts`)
}

async function migrateHayaWaitlist() {
  console.log('\n📝 haya_waitlist')
  const rows = readCsv('scripts/haya-waitlist-export.csv')
  mapNote('haya_waitlist', 'lang', 'lang + language (both populated)')
  await push('haya_waitlist', rows.map(r => ({
    email:        str(r.email),
    phone:        str(r.phone),
    source:       str(r.source),
    signed_up_at: date(r.signed_up_at),
    lang:         str(r.lang) ?? 'en',
    language:     str(r.lang) ?? 'en',
    status:       str(r.status) ?? 'pending',
  })))
}

async function migrateHayaConversations() {
  console.log('\n💬 haya_conversations')
  const rows = readCsv('scripts/haya-conversations-export.csv')
  await push('haya_conversations', rows.map(r => ({
    session_id:     str(r.session_id),
    customer_id:    str(r.customer_id),
    customer_name:  str(r.customer_name),
    clinic_name:    str(r.clinic_name),
    page_url:       str(r.page_url),
    transcript:     str(r.transcript),
    message_count:  int(r.message_count, 0),
    intent_summary: str(r.intent_summary),
    outcome:        str(r.outcome),
    language:       str(r.language) ?? 'en',
    created_at:     date(r.created_at),
    analysed:       bool(r.analysed),
  })))
}

async function main() {
  console.log('🚀 Zevio — CSV → Supabase (Z-005)')
  console.log('   Supabase:', SUPABASE_URL)

  await migrateOrders()
  await migrateCustomers()
  await migrateDisclaimers()
  await migrateAdminUsers()
  await migrateStoreConfig()
  await migrateHayaSocial()
  await migrateHayaWaitlist()
  await migrateHayaConversations()

  if (mappings.length) { console.log('\n🔀 Column mappings applied:'); mappings.forEach(m => console.log(m)) }
  if (dropped.length)  { console.log('\n🗑️  Columns dropped (no target column):'); dropped.forEach(d => console.log(d)) }

  console.log('\n🔍 Verification')
  let anyFailed = false
  for (const r of results) {
    const { count } = await supabase.from(r.table).select('*', { count: 'exact', head: true })
    console.log(`   ${r.table.padEnd(20)} ${String(count ?? 0).padStart(4)} rows in table` +
      (r.failed ? `   (${r.failed} failed)` : '') + (r.note ? `   — ${r.note}` : ''))
    if (r.failed) anyFailed = true
  }

  console.log(anyFailed ? '\n⚠️  Completed with failures — see above' : '\n🎉 Migration complete, zero failures')
  if (anyFailed) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
