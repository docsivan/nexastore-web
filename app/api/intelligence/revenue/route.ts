import { NextRequest, NextResponse } from 'next/server'
import { getPaidOrdersSince, getAllProducts } from '@/lib/supabase'

export const dynamic = 'force-dynamic'


function checkAuth(req: NextRequest) {
  return req.cookies.get('adminAuth')?.value === 'true'
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
  try {
    return (await getPaidOrdersSince(since, 500)) as unknown as OrderRec[]
  } catch { return [] }
}

async function fetchProductCategories(): Promise<Record<string, string>> {
  try {
    const map: Record<string, string> = {}
    for (const r of await getAllProducts()) {
      if (r.fields.item_code) map[r.fields.item_code] = r.fields.category ?? 'Other'
    }
    return map
  } catch { return {} }
}

function parseItems(json: string): ItemLine[] {
  try { return JSON.parse(json) } catch { return [] }
}

function sumOrders(orders: OrderRec[]) {
  return orders.reduce((s, o) => s + (o.fields.total ?? 0), 0)
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now       = new Date()
  const todayStart   = isoDate(startOf(now))
  const weekStart    = isoDate(new Date(now.getTime() - 7  * 86400000))
  const monthStart   = isoDate(new Date(now.getFullYear(), now.getMonth(), 1))
  const lastMoStart  = isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const lastMoEnd    = isoDate(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59))

  const [monthOrders, lastMonthOrders, catMap] = await Promise.all([
    fetchOrdersSince(monthStart),
    // last month: fetch since lastMoStart, then bound to before lastMoEnd
    (async () => {
      const rows = await fetchOrdersSince(lastMoStart)
      return rows.filter(o => (o.fields.created_at ?? '') < lastMoEnd)
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
