import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

function checkAuth(req: NextRequest) {
  return !!req.headers.get('x-admin-pin')
}

type OrderRec = {
  fields: {
    created_at?:     string
    total?:          number
    payment_status?: string
  }
}

type HayaLogRec = {
  fields: {
    created_at?:  string
    signal_type?: string
    item_code?:   string
  }
}

type CROSignal = {
  fields: {
    created_at?:   string
    signal_type?:  string
    page_url?:     string
    session_count?: number
  }
}

async function fetchOrders(since: string): Promise<{ paid: OrderRec[]; abandoned: OrderRec[] }> {
  const paidFormula = encodeURIComponent(
    `AND(IS_AFTER({created_at},"${since}"),{payment_status}="paid")`
  )
  const abandFormula = encodeURIComponent(
    `AND(IS_AFTER({created_at},"${since}"),{payment_status}="pending")`
  )
  const [paidRes, abandRes] = await Promise.all([
    fetch(`${AT_BASE}/Orders?filterByFormula=${paidFormula}&maxRecords=500`, {
      headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store',
    }),
    fetch(`${AT_BASE}/Orders?filterByFormula=${abandFormula}&maxRecords=500`, {
      headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store',
    }),
  ])
  const paid      = paidRes.ok   ? ((await paidRes.json()).records  ?? []) as OrderRec[] : []
  const abandoned = abandRes.ok  ? ((await abandRes.json()).records ?? []) as OrderRec[] : []
  return { paid, abandoned }
}

async function fetchHayaLog(since: string): Promise<HayaLogRec[]> {
  const formula = encodeURIComponent(`IS_AFTER({created_at},"${since}")`)
  const res = await fetch(
    `${AT_BASE}/Nexa_Log?filterByFormula=${formula}&maxRecords=500`,
    { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
  )
  if (!res.ok) return []
  return ((await res.json()).records ?? []) as HayaLogRec[]
}

async function fetchCROSignals(since: string): Promise<CROSignal[]> {
  const formula = encodeURIComponent(`IS_AFTER({created_at},"${since}")`)
  const res = await fetch(
    `${AT_BASE}/Nexa_CRO?filterByFormula=${formula}&maxRecords=500`,
    { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
  )
  if (!res.ok) return []
  return ((await res.json()).records ?? []) as CROSignal[]
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!API_KEY || !BASE_ID) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thirtyAgo  = new Date(now.getTime() - 30 * 86400000).toISOString()

  const [{ paid, abandoned }, hayaLog, croSignals] = await Promise.all([
    fetchOrders(monthStart),
    fetchHayaLog(thirtyAgo),
    fetchCROSignals(thirtyAgo),
  ])

  const totalOrders    = paid.length + abandoned.length
  const conversionRate = totalOrders > 0
    ? parseFloat((paid.length / totalOrders * 100).toFixed(1))
    : 0
  const abandonRate    = totalOrders > 0
    ? parseFloat((abandoned.length / totalOrders * 100).toFixed(1))
    : 0

  // Average order value for paid orders
  const avgOrderValue = paid.length > 0
    ? parseFloat((paid.reduce((s, o) => s + (o.fields.total ?? 0), 0) / paid.length).toFixed(3))
    : 0

  // Signal breakdown from Nexa_Log
  const signalCounts: Record<string, number> = {}
  const productViews: Record<string, number> = {}
  for (const log of hayaLog) {
    const type = log.fields.signal_type ?? 'unknown'
    signalCounts[type] = (signalCounts[type] ?? 0) + 1
    if (type === 'view' && log.fields.item_code) {
      const code = log.fields.item_code
      productViews[code] = (productViews[code] ?? 0) + 1
    }
  }

  const topViewedProducts = Object.entries(productViews)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([item_code, views]) => ({ item_code, views }))

  // CRO: top pages by session count
  const pageSessionMap: Record<string, number> = {}
  for (const sig of croSignals) {
    const url = sig.fields.page_url ?? ''
    if (url) pageSessionMap[url] = (pageSessionMap[url] ?? 0) + (sig.fields.session_count ?? 1)
  }
  const topCROPages = Object.entries(pageSessionMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([page_url, sessions]) => ({ page_url, sessions }))

  const response = NextResponse.json({
    month: {
      paid_orders:      paid.length,
      abandoned_orders: abandoned.length,
      conversion_rate:  conversionRate,
      abandon_rate:     abandonRate,
      avg_order_value:  avgOrderValue,
    },
    signals_30d:         signalCounts,
    top_viewed_products: topViewedProducts,
    top_cro_pages:       topCROPages,
  })
  response.headers.set('Cache-Control', 's-maxage=300')
  return response
}
