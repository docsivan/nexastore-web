import { NextResponse } from 'next/server'
import { getProducts, updateProductsBatch, writeCronLog } from '@/lib/supabase'

export const dynamic     = 'force-dynamic'
export const maxDuration = 300

interface Product {
  id:               string
  discount_percent: number
  stock_quantity:   number
}

async function fetchAllActive(): Promise<Product[]> {
  const records = await getProducts()
  return records.map((r) => ({
    id:               r.id,
    discount_percent: Number(r.fields.discount_percent ?? 0),
    stock_quantity:   Number(r.fields.stock_quantity ?? 0),
  }))
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

export async function GET() {
  try {
    const products = await fetchAllActive()

    if (products.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, message: 'No active products found' })
    }

    const ordered = computeOrder(products)

    let processed = 0
    let failed = 0
    for (let i = 0; i < ordered.length; i += 50) {
      const batch = ordered.slice(i, i + 50).map(r => ({
        id:     r.id,
        fields: { display_order: r.order },
      }))
      const res = await updateProductsBatch(batch)
      processed += res.updated
      failed += res.failed
    }

    await writeCronLog({
      cron_name: 'display_order',
      status: failed ? 'partial' : 'success',
      records_processed: processed,
      error_message: failed ? `${failed} row(s) failed` : undefined,
    })
    return NextResponse.json({
      ok:       true,
      processed,
      failed,
      message:  `Assigned display_order to ${processed} products`,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await writeCronLog({ cron_name: 'display_order', status: 'failed', records_processed: 0, error_message: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
