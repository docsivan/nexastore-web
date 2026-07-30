import { NextResponse } from 'next/server'
import { getProducts, updateProductsBatch, writeCronLog } from '@/lib/supabase'

export const dynamic     = 'force-dynamic'
export const maxDuration = 300

interface Product {
  id:               string
  category:         string
  discount_percent: number
  stock_quantity:   number
  haya_featured:    boolean
  haya_badge:       string
}

async function fetchAllActive(): Promise<Product[]> {
  const records = await getProducts()
  return records.map((r) => ({
    id:               r.id,
    category:         String(r.fields.category ?? ''),
    discount_percent: Number(r.fields.discount_percent ?? 0),
    stock_quantity:   Number(r.fields.stock_quantity ?? 0),
    haya_featured:    Boolean(r.fields.haya_featured ?? false),
    haya_badge:       String(r.fields.haya_badge ?? ''),
  }))
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

export async function GET() {
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
      await writeCronLog({ cron_name: 'haya_badge', status: 'success', records_processed: 0 })
      return NextResponse.json({ ok: true, processed: 0, message: 'All products already have badges' })
    }

    let processed = 0
    let failed = 0
    for (let i = 0; i < updates.length; i += 50) {
      const res = await updateProductsBatch(updates.slice(i, i + 50))
      processed += res.updated
      failed += res.failed
    }

    await writeCronLog({
      cron_name: 'haya_badge',
      status: failed ? 'partial' : 'success',
      records_processed: processed,
      error_message: failed ? `${failed} row(s) failed` : undefined,
    })
    return NextResponse.json({ ok: true, processed, failed, message: `Assigned badges to ${processed} products` })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await writeCronLog({ cron_name: 'haya_badge', status: 'failed', records_processed: 0, error_message: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
