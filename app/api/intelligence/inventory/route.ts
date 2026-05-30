import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

function checkAuth(req: NextRequest) {
  return req.cookies.get('adminAuth')?.value === 'true'
}

type ProductRec = {
  fields: {
    item_code?:       string
    name?:            string
    category?:        string
    stock_quantity?:  number
    final_price?:     number
    cost_price?:      number
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
  item_code?: string
  quantity?:  number
}

async function fetchProducts(): Promise<ProductRec[]> {
  const fields = ['item_code', 'name', 'category', 'stock_quantity', 'final_price', 'cost_price']
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

function trafficLight(qty: number): 'green' | 'amber' | 'red' {
  if (qty > 20) return 'green'
  if (qty >= 10) return 'amber'
  return 'red'
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!API_KEY || !BASE_ID) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  const [products, orders] = await Promise.all([
    fetchProducts(),
    fetchPaidOrdersSince(thirtyDaysAgo),
  ])

  // Count units sold per product in last 30 days
  const unitsSold: Record<string, number> = {}
  for (const order of orders) {
    for (const item of parseItems(order.fields.items ?? '[]')) {
      const code = item.item_code ?? ''
      if (code) unitsSold[code] = (unitsSold[code] ?? 0) + (item.quantity ?? 1)
    }
  }

  const lowStock:  typeof stockList = []
  const deadStock: typeof stockList = []
  const stockList: Array<{
    item_code: string
    name:      string
    category:  string
    stock:     number
    sold_30d:  number
    daily_velocity:   number
    days_to_stockout: number | null
    stock_value:      number
    status:    'green' | 'amber' | 'red'
  }> = []

  for (const p of products) {
    const code  = p.fields.item_code ?? ''
    if (!code) continue
    const stock = p.fields.stock_quantity ?? 0
    const sold  = unitsSold[code] ?? 0
    const velocity    = parseFloat((sold / 30).toFixed(4))
    const daysToOut   = velocity > 0 ? Math.round(stock / velocity) : null
    const stockValue  = parseFloat((stock * (p.fields.cost_price ?? p.fields.final_price ?? 0)).toFixed(3))
    const status      = trafficLight(stock)

    const entry = {
      item_code:        code,
      name:             p.fields.name ?? code,
      category:         p.fields.category ?? 'Other',
      stock,
      sold_30d:         sold,
      daily_velocity:   velocity,
      days_to_stockout: daysToOut,
      stock_value:      stockValue,
      status,
    }
    stockList.push(entry)

    if (stock < 10) lowStock.push(entry)
    if (stock > 20 && sold === 0) deadStock.push(entry)
  }

  // Category-level stock value
  const catValue: Record<string, number> = {}
  for (const e of stockList) {
    catValue[e.category] = parseFloat(((catValue[e.category] ?? 0) + e.stock_value).toFixed(3))
  }

  const totalStockValue = parseFloat(
    stockList.reduce((s, e) => s + e.stock_value, 0).toFixed(3)
  )

  const response = NextResponse.json({
    summary: {
      total_products:    products.length,
      low_stock_count:   lowStock.length,
      dead_stock_count:  deadStock.length,
      total_stock_value: totalStockValue,
    },
    low_stock:  lowStock.sort((a, b) => a.stock - b.stock).slice(0, 20),
    dead_stock: deadStock.sort((a, b) => b.stock - a.stock).slice(0, 20),
    by_category_value: catValue,
    all: stockList.sort((a, b) => a.stock - b.stock),
  })
  response.headers.set('Cache-Control', 's-maxage=300')
  return response
}
