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
  discount_percent: number
  stock_quantity:   number
}

async function fetchAllActive(): Promise<Product[]> {
  const records: Product[] = []
  let offset: string | undefined

  do {
    const url = new URL(`${AT_BASE}/Products`)
    url.searchParams.set('filterByFormula', '{is_active}=1')
    url.searchParams.set('fields[]', 'discount_percent')
    url.searchParams.append('fields[]', 'stock_quantity')
    if (offset) url.searchParams.set('offset', offset)

    const res = await fetch(url.toString(), { headers: HEADERS, cache: 'no-store' })
    if (!res.ok) throw new Error(`Airtable list failed: ${res.status}`)
    const data = await res.json()

    for (const r of data.records ?? []) {
      records.push({
        id:               r.id,
        discount_percent: r.fields.discount_percent ?? 0,
        stock_quantity:   r.fields.stock_quantity   ?? 0,
      })
    }

    offset = data.offset
    if (offset) await wait(200)
  } while (offset)

  return records
}

function computeOrder(products: Product[]): { id: string; order: number }[] {
  // Group 1 — non-moving (discount_percent = 25): highest priority, rank first
  const nonMoving = products
    .filter(p => p.discount_percent === 25)
    .sort((a, b) => b.stock_quantity - a.stock_quantity)

  // Group 2 — slow-moving (discount_percent = 15): rank after non-moving
  const slowMoving = products
    .filter(p => p.discount_percent === 15)
    .sort((a, b) => b.stock_quantity - a.stock_quantity)

  // Group 3 — everything else
  const rest = products
    .filter(p => p.discount_percent !== 25 && p.discount_percent !== 15)
    .sort((a, b) => b.stock_quantity - a.stock_quantity)

  return [...nonMoving, ...slowMoving, ...rest].map((p, i) => ({ id: p.id, order: i + 1 }))
}

async function patchBatch(batch: { id: string; fields: { display_order: number } }[]) {
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
    const products = await fetchAllActive()

    if (products.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, message: 'No active products found' })
    }

    const ordered = computeOrder(products)

    let processed = 0
    for (let i = 0; i < ordered.length; i += 10) {
      const batch = ordered.slice(i, i + 10).map(r => ({
        id:     r.id,
        fields: { display_order: r.order },
      }))
      await patchBatch(batch)
      processed += batch.length
      if (i + 10 < ordered.length) await wait(200)
    }

    await logCron('display_order', processed, 'success')
    return NextResponse.json({
      ok:       true,
      processed,
      message:  `Assigned display_order to ${processed} products`,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await logCron('display_order', 0, 'failed', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
