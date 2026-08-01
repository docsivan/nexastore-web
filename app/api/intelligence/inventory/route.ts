import { NextRequest, NextResponse } from 'next/server'
import { getPaidOrdersSince, getAllProducts } from '@/lib/supabase'

export const dynamic = 'force-dynamic'


function checkAuth(req: NextRequest) {
  return req.cookies.get('adminAuth')?.value === 'true'
}

type ProductRec = {
  item_code?:       string
  name?:            string
  category?:        string
  stock_quantity?:  number
  final_price?:     number
  cost_price?:      number
}

type OrderRec = {
  created_at?: string
  items?:      string
  payment_status?: string
}

type ItemLine = {
  item_code?: string
  quantity?:  number
}

async function fetchProducts(): Promise<ProductRec[]> {
  try {
    return (await getAllProducts()) as unknown as ProductRec[]
  } catch { return [] }
}

async function fetchPaidOrdersSince(since: string): Promise<OrderRec[]> {
  try {
    return (await getPaidOrdersSince(since, 500)) as unknown as OrderRec[]
  } catch { return [] }
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

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  const [products, orders] = await Promise.all([
    fetchProducts(),
    fetchPaidOrdersSince(thirtyDaysAgo),
  ])

  // Count units sold per product in last 30 days
  const unitsSold: Record<string, number> = {}
  for (const order of orders) {
    for (const item of parseItems(order.items ?? '[]')) {
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
    const code  = p.item_code ?? ''
    if (!code) continue
    const stock = p.stock_quantity ?? 0
    const sold  = unitsSold[code] ?? 0
    const velocity    = parseFloat((sold / 30).toFixed(4))
    const daysToOut   = velocity > 0 ? Math.round(stock / velocity) : null
    const stockValue  = parseFloat((stock * (p.cost_price ?? p.final_price ?? 0)).toFixed(3))
    const status      = trafficLight(stock)

    const entry = {
      item_code:        code,
      name:             p.name ?? code,
      category:         p.category ?? 'Other',
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
