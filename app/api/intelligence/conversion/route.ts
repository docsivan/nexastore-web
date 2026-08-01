import { NextRequest, NextResponse } from 'next/server'
import { getPaidOrdersSince, getOrdersSince, readAiTable, asRecords } from '@/lib/supabase'

export const dynamic = 'force-dynamic'


function checkAuth(req: NextRequest) {
  return req.cookies.get('adminAuth')?.value === 'true'
}

type OrderRec = {
  created_at?:     string
  total?:          number
  payment_status?: string
}

type HayaLogRec = {
  created_at?:  string
  signal_type?: string
  item_code?:   string
}

type CROSignal = {
  created_at?:   string
  signal_type?:  string
  page_url?:     string
  session_count?: number
}

async function fetchOrders(since: string): Promise<{ paid: OrderRec[]; abandoned: OrderRec[] }> {
  try {
    const [paid, pending] = await Promise.all([
      getPaidOrdersSince(since, 500),
      getOrdersSince(since, 500),
    ])
    return {
      paid: paid as unknown as OrderRec[],
      // "abandoned" == still pending payment
      abandoned: pending.filter(
        (o) => o.payment_status === 'pending'
      ) as unknown as OrderRec[],
    }
  } catch { return { paid: [], abandoned: [] } }
}

async function fetchHayaLog(since: string): Promise<HayaLogRec[]> {
  try {
    return asRecords(await readAiTable('ai_log', { since, limit: 500 })) as unknown as HayaLogRec[]
  } catch { return [] }
}

async function fetchCROSignals(since: string): Promise<CROSignal[]> {
  try {
    return asRecords(await readAiTable('ai_cro', { since, limit: 500 })) as unknown as CROSignal[]
  } catch { return [] }
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    ? parseFloat((paid.reduce((s, o) => s + (o.total ?? 0), 0) / paid.length).toFixed(3))
    : 0

  // Signal breakdown from Nexa_Log
  const signalCounts: Record<string, number> = {}
  const productViews: Record<string, number> = {}
  for (const log of hayaLog) {
    const type = log.signal_type ?? 'unknown'
    signalCounts[type] = (signalCounts[type] ?? 0) + 1
    if (type === 'view' && log.item_code) {
      const code = log.item_code
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
    const url = sig.page_url ?? ''
    if (url) pageSessionMap[url] = (pageSessionMap[url] ?? 0) + (sig.session_count ?? 1)
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
