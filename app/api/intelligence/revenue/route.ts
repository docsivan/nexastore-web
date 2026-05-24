import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

function checkAuth(req: NextRequest) {
  return !!req.headers.get('x-admin-pin')
}

function startOf(d: Date) { const c = new Date(d); c.setHours(0,0,0,0); return c }
function isoDate(d: Date)  { return d.toISOString() }

type OrderRec = {
  fields: {
    created_at?: string
    total?:      number
    items?:      string
    payment_status?: string
  }
}

type ItemLine = {
  item_code?: string
  name?:      string
  final_price?: number
  quantity?:  number
  category?:  string
}

async function fetchOrdersSince(since: string): Promise<OrderRec[]> {
  const formula = encodeURIComponent(
    `AND(IS_AFTER({created_at},"${since}"),{payment_status}="paid")`
  )
  const res = await fetch(
    `${AT_BASE}/Orders?filterByFormula=${formula}&maxRecords=500`,
    { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.records ?? []
}

async function fetchProductCategories(): Promise<Record<string, string>> {
  const res = await fetch(
    `${AT_BASE}/Products?fields[]=item_code&fields[]=category&maxRecords=500`,
    { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
  )
  if (!res.ok) return {}
  const data = await res.json()
  const map: Record<string, string> = {}
  for (const r of (data.records ?? [])) {
    if (r.fields.item_code) map[r.fields.item_code] = r.fields.category ?? 'Other'
  }
  return map
}

function parseItems(json: string): ItemLine[] {
  try { return JSON.parse(json) } catch { return [] }
}

function sumOrders(orders: OrderRec[]) {
  return orders.reduce((s, o) => s + (o.fields.total ?? 0), 0)
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!API_KEY || !BASE_ID) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const now       = new Date()
  const todayStart   = isoDate(startOf(now))
  const weekStart    = isoDate(new Date(now.getTime() - 7  * 86400000))
  const monthStart   = isoDate(new Date(now.getFullYear(), now.getMonth(), 1))
  const lastMoStart  = isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const lastMoEnd    = isoDate(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59))

  const [monthOrders, lastMonthOrders, catMap] = await Promise.all([
    fetchOrdersSince(monthStart),
    // last month: fetch since lastMoStart, filter to before lastMoEnd
    (async () => {
      const formula = encodeURIComponent(
        `AND(IS_AFTER({created_at},"${lastMoStart}"),IS_BEFORE({created_at},"${lastMoEnd}"),{payment_status}="paid")`
      )
      const res = await fetch(`${AT_BASE}/Orders?filterByFormula=${formula}&maxRecords=500`, {
        headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store'
      })
      if (!res.ok) return []
      return ((await res.json()).records ?? []) as OrderRec[]
    })(),
    fetchProductCategories(),
  ])

  const todayOrders  = monthOrders.filter(o => (o.fields.created_at ?? '') >= todayStart)
  const weekOrders   = monthOrders.filter(o => (o.fields.created_at ?? '') >= weekStart)

  // Revenue by category this month
  const catRevenue: Record<string, number> = {}
  const productRevenue: Record<string, { name: string; revenue: number }> = {}

  for (const order of monthOrders) {
    for (const item of parseItems(order.fields.items ?? '[]')) {
      const code = item.item_code ?? ''
      const cat  = catMap[code] ?? item.category ?? 'Other'
      const rev  = (item.final_price ?? 0) * (item.quantity ?? 1)
      catRevenue[cat] = (catRevenue[cat] ?? 0) + rev
      if (code) {
        if (!productRevenue[code]) productRevenue[code] = { name: item.name ?? code, revenue: 0 }
        productRevenue[code].revenue += rev
      }
    }
  }

  const top5 = Object.entries(productRevenue)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([code, p]) => ({ item_code: code, name: p.name, revenue: parseFloat(p.revenue.toFixed(3)) }))

  const response = NextResponse.json({
    today:         { orders: todayOrders.length,     revenue: parseFloat(sumOrders(todayOrders).toFixed(3))  },
    week:          { orders: weekOrders.length,      revenue: parseFloat(sumOrders(weekOrders).toFixed(3))   },
    month:         { orders: monthOrders.length,     revenue: parseFloat(sumOrders(monthOrders).toFixed(3))  },
    last_month:    { orders: lastMonthOrders.length, revenue: parseFloat(sumOrders(lastMonthOrders).toFixed(3)) },
    by_category:   catRevenue,
    top_products:  top5,
  })
  response.headers.set('Cache-Control', 's-maxage=300')
  return response
}
