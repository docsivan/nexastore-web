import { NextRequest, NextResponse } from 'next/server'
import { getPaidOrdersSince } from '@/lib/supabase'

export const dynamic = 'force-dynamic'


function checkAuth(req: NextRequest) {
  return req.cookies.get('adminAuth')?.value === 'true'
}

type OrderRec = {
  fields: {
    created_at?:     string
    total?:          number
    customer_name?:  string
    customer_phone?: string
    customer_id?:    string
    payment_status?: string
  }
}

async function fetchPaidOrdersSince(since: string): Promise<OrderRec[]> {
  try {
    return (await getPaidOrdersSince(since, 500)) as unknown as OrderRec[]
  } catch { return [] }
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now         = new Date()
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const ninetyAgo   = new Date(now.getTime() - 90 * 86400000).toISOString()
  const thirtyAgo   = new Date(now.getTime() - 30 * 86400000).toISOString()
  const sixtyAgo    = new Date(now.getTime() - 60 * 86400000).toISOString()

  const [monthOrders, ninetyOrders] = await Promise.all([
    fetchPaidOrdersSince(monthStart),
    fetchPaidOrdersSince(ninetyAgo),
  ])

  // Customer aggregation over 90 days
  const customerMap: Record<string, {
    name:      string
    orders:    number
    revenue:   number
    lastOrder: string
  }> = {}

  for (const order of ninetyOrders) {
    const key  = order.fields.customer_phone ?? order.fields.customer_id ?? order.fields.customer_name ?? 'unknown'
    const name = order.fields.customer_name ?? key
    const ts   = order.fields.created_at ?? ''
    if (!customerMap[key]) customerMap[key] = { name, orders: 0, revenue: 0, lastOrder: ts }
    customerMap[key].orders  += 1
    customerMap[key].revenue += order.fields.total ?? 0
    if (ts > customerMap[key].lastOrder) customerMap[key].lastOrder = ts
  }

  const customerList = Object.values(customerMap)
  const totalCustomers = customerList.length
  const repeatCustomers = customerList.filter(c => c.orders > 1).length
  const repeatRate = totalCustomers > 0
    ? parseFloat((repeatCustomers / totalCustomers * 100).toFixed(1))
    : 0

  // Average order value this month
  const monthTotal  = monthOrders.reduce((s, o) => s + (o.fields.total ?? 0), 0)
  const avgOrderValue = monthOrders.length > 0
    ? parseFloat((monthTotal / monthOrders.length).toFixed(3))
    : 0

  // New vs returning this month
  const monthKeys = new Set(
    monthOrders.map(o =>
      o.fields.customer_phone ?? o.fields.customer_id ?? o.fields.customer_name ?? 'unknown'
    )
  )

  // Customers with orders in 30–60 day window (churning) but not in last 30 days
  const last30Keys = new Set(
    ninetyOrders
      .filter(o => (o.fields.created_at ?? '') >= thirtyAgo)
      .map(o => o.fields.customer_phone ?? o.fields.customer_id ?? o.fields.customer_name ?? 'unknown')
  )
  const prev30Keys = new Set(
    ninetyOrders
      .filter(o => {
        const ts = o.fields.created_at ?? ''
        return ts >= sixtyAgo && ts < thirtyAgo
      })
      .map(o => o.fields.customer_phone ?? o.fields.customer_id ?? o.fields.customer_name ?? 'unknown')
  )
  const atRiskCount = Array.from(prev30Keys).filter(k => !last30Keys.has(k)).length

  // Top customers by revenue (90 days)
  const topCustomers = customerList
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map(c => ({
      name:      c.name,
      orders:    c.orders,
      revenue:   parseFloat(c.revenue.toFixed(3)),
      last_order: c.lastOrder,
    }))

  const response = NextResponse.json({
    month: {
      new_customers:    monthKeys.size,
      orders:           monthOrders.length,
      revenue:          parseFloat(monthTotal.toFixed(3)),
      avg_order_value:  avgOrderValue,
    },
    ninety_days: {
      unique_customers: totalCustomers,
      repeat_customers: repeatCustomers,
      repeat_rate_pct:  repeatRate,
      at_risk_count:    atRiskCount,
    },
    top_customers: topCustomers,
  })
  response.headers.set('Cache-Control', 's-maxage=300')
  return response
}
