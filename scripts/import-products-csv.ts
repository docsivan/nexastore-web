/**
 * Zevio — Products CSV -> Supabase importer.
 *
 * Bypasses the Airtable API entirely (its monthly public-API quota is exhausted).
 * Source: an Airtable UI CSV export, so it carries Airtable's export quirks:
 *   - UTF-8 BOM on the header row
 *   - checkbox fields export as "checked" / "" rather than true/false
 *   - empty cells for date/number columns must become null, not ''
 *
 * Run: npx tsx scripts/import-products-csv.ts [path/to.csv]
 */

import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const CSV_PATH = process.argv[2] ?? 'scripts/products-export.csv'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── CSV parsing (RFC 4180: quoted fields, escaped quotes, embedded newlines) ──

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
      continue
    }

    if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\r') {
      // ignore; handled by \n
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

// ── Cell coercion ─────────────────────────────────────────

const str = (v?: string) => {
  const s = (v ?? '').trim()
  return s.length ? s : null
}

/** Airtable checkbox columns export as "checked" (or true/1) when set. */
const bool = (v?: string) => {
  const s = (v ?? '').trim().toLowerCase()
  return s === 'checked' || s === 'true' || s === '1' || s === 'yes'
}

const num = (v: string | undefined, fallback: number | null = null) => {
  const s = (v ?? '').trim()
  if (!s) return fallback
  const n = Number(s.replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(n) ? n : fallback
}

const int = (v: string | undefined, fallback: number | null = null) => {
  const n = num(v, null)
  return n === null ? fallback : Math.round(n)
}

async function main() {
  const abs = path.resolve(CSV_PATH)
  if (!fs.existsSync(abs)) {
    console.error(`CSV not found: ${abs}`)
    process.exit(1)
  }

  console.log('🚀 Zevio — Products CSV → Supabase')
  console.log('   CSV     :', abs)
  console.log('   Supabase:', SUPABASE_URL)

  // Strip UTF-8 BOM before parsing, or the first header becomes "﻿item_code".
  const raw = fs.readFileSync(abs, 'utf8').replace(/^﻿/, '')
  const rows = parseCsv(raw).filter((r) => r.some((c) => c.trim().length))

  if (rows.length < 2) {
    console.error('CSV has no data rows.')
    process.exit(1)
  }

  const header = rows[0].map((h) => h.trim())
  const idx = (name: string) => header.indexOf(name)
  console.log(`   Columns : ${header.length}`)
  console.log(`   Rows    : ${rows.length - 1}`)

  const col = {
    item_code: idx('item_code'),
    sku: idx('sku'),
    name: idx('name'),
    category: idx('category'),
    brand: idx('brand'),
    pack_size: idx('pack_size'),
    batch_number: idx('batch_number'),
    expiry_date: idx('expiry_date'),
    cost_price: idx('cost_price'),
    list_price: idx('list_price'),
    discount_percent: idx('discount_percent'),
    final_price: idx('final_price'),
    stock_quantity: idx('stock_quantity'),
    product_page_url: idx('product_page_url'),
    is_active: idx('is_active'),
    display_order: idx('display_order'),
    haya_featured: idx('haya_featured'),
    haya_badge: idx('haya_badge'),
    nameAr: idx('nameAr'),
    descriptionAr: idx('descriptionAr'),
    categoryAr: idx('categoryAr'),
    image_url: idx('image_url'),
  }

  if (col.item_code < 0 || col.name < 0) {
    console.error('CSV must contain item_code and name columns.')
    process.exit(1)
  }

  const at = (r: string[], i: number) => (i >= 0 ? r[i] : undefined)
  const skipped: string[] = []

  const products = rows.slice(1).flatMap((r) => {
    const item_code = str(at(r, col.item_code))
    const name = str(at(r, col.name))
    if (!item_code || !name) {
      skipped.push(item_code ?? name ?? '(blank row)')
      return []
    }
    return [
      {
        item_code,
        sku: str(at(r, col.sku)),
        name,
        category: str(at(r, col.category)),
        brand: str(at(r, col.brand)),
        pack_size: str(at(r, col.pack_size)),
        batch_number: str(at(r, col.batch_number)),
        expiry_date: str(at(r, col.expiry_date)), // null when blank — it's a date column
        cost_price: num(at(r, col.cost_price)),
        list_price: num(at(r, col.list_price)),
        discount_percent: num(at(r, col.discount_percent), 0),
        final_price: num(at(r, col.final_price), 0),
        stock_quantity: int(at(r, col.stock_quantity), 0),
        product_page_url: str(at(r, col.product_page_url)),
        is_active: bool(at(r, col.is_active)),
        display_order: int(at(r, col.display_order), 0),
        haya_featured: bool(at(r, col.haya_featured)),
        haya_badge: str(at(r, col.haya_badge)),
        name_ar: str(at(r, col.nameAr)),
        description_ar: str(at(r, col.descriptionAr)),
        category_ar: str(at(r, col.categoryAr)),
        image_url: str(at(r, col.image_url)),
      },
    ]
  })

  if (skipped.length) {
    console.log(`   ⚠️  Skipped ${skipped.length} row(s) missing item_code/name`)
  }

  const activeCount = products.filter((p) => p.is_active).length
  console.log(`   Parsed  : ${products.length} products (${activeCount} active)`)

  // The base schema has no list_price column. Probe once, and drop the field
  // (rather than failing the whole import) if it hasn't been added yet.
  let includeListPrice = true
  const probe = await supabase
    .from('products')
    .select('list_price')
    .limit(1)
  if (probe.error) {
    includeListPrice = false
    console.log('   ⚠️  No list_price column in Supabase — importing without it.')
    console.log('      UI strikethrough pricing needs it. To keep that data, run:')
    console.log('        alter table products add column list_price decimal(10,3);')
    console.log('      then re-run this script (it upserts, so it is safe).')
  }

  const payload = includeListPrice
    ? products
    : products.map(({ list_price, ...rest }) => rest)

  let success = 0
  let failed = 0

  for (let i = 0; i < payload.length; i += 50) {
    const batch = payload.slice(i, i + 50)
    const n = Math.floor(i / 50) + 1
    const { error } = await supabase
      .from('products')
      .upsert(batch, { onConflict: 'item_code' })
    if (error) {
      console.error(`   ❌ Batch ${n} failed: ${error.message}`)
      failed += batch.length
    } else {
      success += batch.length
      console.log(`   ✅ Batch ${n} — ${batch.length} products upserted`)
    }
  }

  console.log(`\n   Result: ${success} succeeded, ${failed} failed`)

  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
  const { count: activeInDb } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  console.log(`   Products in Supabase: ${count} (${activeInDb} active)`)

  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})
