import { NextResponse } from 'next/server'

export const dynamic    = 'force-dynamic'
export const maxDuration = 300

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`
const HEADERS = {
  Authorization:  `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

interface Product {
  id:               string
  category:         string
  discount_percent: number
  stock_quantity:   number
  haya_featured:    boolean
  haya_badge:       string
}

async function fetchAllActive(): Promise<Product[]> {
  const records: Product[] = []
  let offset: string | undefined

  do {
    const url = new URL(`${AT_BASE}/Products`)
    url.searchParams.set('filterByFormula', '{is_active}=1')
    url.searchParams.set('fields[]', 'category')
    url.searchParams.append('fields[]', 'discount_percent')
    url.searchParams.append('fields[]', 'stock_quantity')
    url.searchParams.append('fields[]', 'haya_featured')
    url.searchParams.append('fields[]', 'haya_badge')
    if (offset) url.searchParams.set('offset', offset)

    const res = await fetch(url.toString(), { headers: HEADERS, cache: 'no-store' })
    if (!res.ok) throw new Error(`Airtable list failed: ${res.status}`)
    const data = await res.json()

    for (const r of data.records ?? []) {
      records.push({
        id:               r.id,
        category:         r.fields.category         ?? '',
        discount_percent: r.fields.discount_percent ?? 0,
        stock_quantity:   r.fields.stock_quantity   ?? 0,
        haya_featured:    r.fields.haya_featured     ?? false,
        haya_badge:       r.fields.haya_badge        ?? '',
      })
    }

    offset = data.offset
    if (offset) await wait(200)
  } while (offset)

  return records
}

function topSellerIds(products: Product[]): Set<string> {
  const byCategory = new Map<string, Product[]>()
  for (const p of products) {
    const cat = p.category || 'other'
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(p)
  }
  const ids = new Set<string>()
  Array.from(byCategory.values()).forEach(prods => {
    prods
      .sort((a, b) => b.stock_quantity - a.stock_quantity)
      .slice(0, 10)
      .forEach(p => ids.add(p.id))
  })
  return ids
}

function assignBadge(p: Product, topIds: Set<string>): string | null {
  if (p.discount_percent === 25) return 'Flash Deal'
  if (p.discount_percent === 15 && p.stock_quantity <= 20) return 'Urgent'
  if (p.discount_percent === 15 && p.stock_quantity > 20) return 'Slow Mover'
  if (p.haya_featured) return 'Featured'
  if (topIds.has(p.id)) return 'Top Seller'
  return null
}

async function patchBatch(batch: { id: string; fields: { haya_badge: string } }[]) {
  const res = await fetch(`${AT_BASE}/Products`, {
    method:  'PATCH',
    headers: HEADERS,
    body:    JSON.stringify({ records: batch }),
  })
  if (!res.ok) throw new Error(`Airtable PATCH failed: ${res.status}`)
}

async function logCron(cron: string, count: number, status: 'success' | 'failed', error = '') {
  await fetch(`${AT_BASE}/Haya_Cron_Log`, {
    method:  'POST',
    headers: HEADERS,
    body: JSON.stringify({
      records: [{
        fields: {
          cron_name:         cron,
          status,
          records_processed: count,
          error_message:     error,
          run_at:            new Date().toISOString(),
        },
      }],
    }),
  }).catch(() => {})
}

export async function GET() {
  if (!API_KEY || !BASE_ID) {
    return NextResponse.json({ error: 'Airtable not configured' }, { status: 500 })
  }

  try {
    const all    = await fetchAllActive()
    const topIds = topSellerIds(all)

    // Only process products without a badge
    const updates = all
      .filter(p => !p.haya_badge)
      .flatMap(p => {
        const badge = assignBadge(p, topIds)
        return badge ? [{ id: p.id, fields: { haya_badge: badge } }] : []
      })

    if (updates.length === 0) {
      await logCron('haya_badge', 0, 'success')
      return NextResponse.json({ ok: true, processed: 0, message: 'All products already have badges' })
    }

    let processed = 0
    for (let i = 0; i < updates.length; i += 10) {
      await patchBatch(updates.slice(i, i + 10))
      processed += Math.min(10, updates.length - i)
      if (i + 10 < updates.length) await wait(200)
    }

    await logCron('haya_badge', processed, 'success')
    return NextResponse.json({ ok: true, processed, message: `Assigned badges to ${processed} products` })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await logCron('haya_badge', 0, 'failed', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
