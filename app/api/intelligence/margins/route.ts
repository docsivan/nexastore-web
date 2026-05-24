import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

function checkAuth(req: NextRequest) {
  return !!req.headers.get('x-admin-pin')
}

type ProductRec = {
  fields: {
    item_code?:    string
    name?:         string
    category?:     string
    final_price?:  number
    cost_price?:   number
  }
}

type OrderRec = {
  fields: {
    created_at?: string
    items?:      string
    payment_status?: string
  }
}

type ItemLine = {
  item_code?:   string
  final_price?: number
  quantity?:    number
}

async function fetchProducts(): Promise<ProductRec[]> {
  const fields = ['item_code', 'name', 'category', 'final_price', 'cost_price']
  const qs = fields.map(f => `fields[]=${encodeURIComponent(f)}`).join('&')
  const res = await fetch(`${AT_BASE}/Products?${qs}&maxRecords=500`, {
    headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store',
  })
  if (!res.ok) return []
  return ((await res.json()).records ?? []) as ProductRec[]
}

async function fetchPaidOrdersSince(since: string): Promise<OrderRec[]> {
  const formula = encodeURIComponent(
    `AND(IS_AFTER({created_at},"${since}"),{payment_status}="paid")`
  )
  const res = await fetch(
    `${AT_BASE}/Orders?filterByFormula=${formula}&maxRecords=500`,
    { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
  )
  if (!res.ok) return []
  return ((await res.json()).records ?? []) as OrderRec[]
}

function parseItems(json: string): ItemLine[] {
  try { return JSON.parse(json) } catch { return [] }
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!API_KEY || !BASE_ID) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [products, orders] = await Promise.all([
    fetchProducts(),
    fetchPaidOrdersSince(monthStart.toISOString()),
  ])

  // Build lookup maps from Products
  const productMap: Record<string, { name: string; category: string; cost: number; price: number }> = {}
  for (const p of products) {
    const code = p.fields.item_code
    if (!code) continue
    productMap[code] = {
      name:     p.fields.name ?? code,
      category: p.fields.category ?? 'Other',
      cost:     p.fields.cost_price ?? 0,
      price:    p.fields.final_price ?? 0,
    }
  }

  // Aggregate revenue and cost per product from this month's orders
  const productSales: Record<string, { name: string; category: string; revenue: number; cost: number; units: number }> = {}

  for (const order of orders) {
    for (const item of parseItems(order.fields.items ?? '[]')) {
      const code = item.item_code ?? ''
      if (!code) continue
      const prod     = productMap[code]
      const price    = item.final_price ?? prod?.price ?? 0
      const qty      = item.quantity ?? 1
      const unitCost = prod?.cost ?? 0

      if (!productSales[code]) {
        productSales[code] = {
          name:     prod?.name ?? code,
          category: prod?.category ?? 'Other',
          revenue:  0,
          cost:     0,
          units:    0,
        }
      }
      productSales[code].revenue += price * qty
      productSales[code].cost    += unitCost * qty
      productSales[code].units   += qty
    }
  }

  // Category-level margin aggregation
  const catRevenue: Record<string, number> = {}
  const catCost:    Record<string, number> = {}

  for (const s of Object.values(productSales)) {
    catRevenue[s.category] = (catRevenue[s.category] ?? 0) + s.revenue
    catCost[s.category]    = (catCost[s.category]    ?? 0) + s.cost
  }

  const byCategory: Record<string, { revenue: number; cost: number; margin_pct: number }> = {}
  for (const cat of Object.keys(catRevenue)) {
    const rev = catRevenue[cat]
    const cst = catCost[cat]
    byCategory[cat] = {
      revenue:    parseFloat(rev.toFixed(3)),
      cost:       parseFloat(cst.toFixed(3)),
      margin_pct: rev > 0 ? parseFloat(((rev - cst) / rev * 100).toFixed(1)) : 0,
    }
  }

  // Rank products with known cost
  const ranked = Object.entries(productSales)
    .filter(([code]) => productMap[code]?.cost > 0)
    .map(([code, s]) => ({
      item_code:  code,
      name:       s.name,
      category:   s.category,
      revenue:    parseFloat(s.revenue.toFixed(3)),
      margin_pct: s.revenue > 0
        ? parseFloat(((s.revenue - s.cost) / s.revenue * 100).toFixed(1))
        : 0,
      units: s.units,
    }))
    .sort((a, b) => b.margin_pct - a.margin_pct)

  const response = NextResponse.json({
    by_category:       byCategory,
    highest_margin:    ranked.slice(0, 5),
    lowest_margin:     [...ranked].sort((a, b) => a.margin_pct - b.margin_pct).slice(0, 5),
    overall_margin_pct: (() => {
      const totalRev  = Object.values(productSales).reduce((s, p) => s + p.revenue, 0)
      const totalCost = Object.values(productSales).reduce((s, p) => s + p.cost,    0)
      return totalRev > 0 ? parseFloat(((totalRev - totalCost) / totalRev * 100).toFixed(1)) : 0
    })(),
  })
  response.headers.set('Cache-Control', 's-maxage=300')
  return response
}
