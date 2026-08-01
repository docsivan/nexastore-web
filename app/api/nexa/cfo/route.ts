import { NextRequest, NextResponse } from 'next/server'
import { atCreate } from '@/lib/ai-tables'
import { getPaidOrdersSince, getAllProducts } from '@/lib/supabase'
import { callSonnet } from '@/lib/claude'
import { runRevenuLeakAgent } from '@/lib/nexa-agents'
import { getStoreContext } from '@/lib/ai-context'

export const dynamic = 'force-dynamic'


function checkAuth(req: NextRequest): boolean {
  const cronSecret = req.headers.get('x-cron-secret')
  return cronSecret === process.env.CRON_SECRET || req.cookies.get('adminAuth')?.value === 'true'
}

function nanoid(): string {
  return `cfo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

type OrderRec = {
  created_at?:     string
  total?:          number
  payment_status?: string
  items?:          string
  customer_name?:  string
}

type ProductRec = {
  item_code?:      string
  name?:           string
  category?:       string
  stock_quantity?: number
  final_price?:    number
  cost_price?:     number
}

type ItemLine = {
  item_code?:   string
  final_price?: number
  quantity?:    number
}

async function fetchPaidOrders(since: string): Promise<OrderRec[]> {
  try {
    return (await getPaidOrdersSince(since, 500)) as unknown as OrderRec[]
  } catch { return [] }
}

async function fetchProducts(): Promise<ProductRec[]> {
  try {
    return (await getAllProducts()) as unknown as ProductRec[]
  } catch { return [] }
}

function parseItems(json: string): ItemLine[] {
  try { return JSON.parse(json) } catch { return [] }
}

async function writeInsight(text: string) {
  await atCreate('Nexa_Insights', {
    insight_id:   nanoid(),
    insight_type: 'cfo_analysis',
    insight_text: text,
    priority:     '2',
    status:       'new',
    data_window:  'last_30_days',
  })
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const thirtyAgo  = new Date(Date.now() - 30 * 86400000).toISOString()
    const sixtyAgo   = new Date(Date.now() - 60 * 86400000).toISOString()

    const [orders30, orders60, products] = await Promise.all([
      fetchPaidOrders(thirtyAgo),
      fetchPaidOrders(sixtyAgo),
      fetchProducts(),
    ])

    // Filter orders60 to get 30–60 day window (not included in orders30)
    const orders30Set = new Set(orders30.map(o => o.created_at ?? ''))
    const orders30_60 = orders60.filter(o => !orders30Set.has(o.created_at ?? ''))

    // Build product cost map
    const productMap: Record<string, { name: string; category: string; cost: number; price: number; stock: number }> = {}
    for (const p of products) {
      const code = p.item_code
      if (!code) continue
      productMap[code] = {
        name:     p.name ?? code,
        category: p.category ?? 'Other',
        cost:     p.cost_price ?? 0,
        price:    p.final_price ?? 0,
        stock:    p.stock_quantity ?? 0,
      }
    }

    // 30-day financials
    const revenue30  = orders30.reduce((s, o) => s + (o.total ?? 0), 0)
    const revenue60  = orders30_60.reduce((s, o) => s + (o.total ?? 0), 0)
    const revenueGrowth = revenue60 > 0
      ? parseFloat(((revenue30 - revenue60) / revenue60 * 100).toFixed(1))
      : 0

    // Gross margin this month
    let totalRevenue = 0, totalCost = 0
    const catRevenue: Record<string, number> = {}
    const catCost:    Record<string, number> = {}

    for (const order of orders30) {
      for (const item of parseItems(order.items ?? '[]')) {
        const code  = item.item_code ?? ''
        const prod  = productMap[code]
        const price = item.final_price ?? prod?.price ?? 0
        const qty   = item.quantity ?? 1
        const cost  = (prod?.cost ?? 0) * qty
        const rev   = price * qty
        const cat   = prod?.category ?? 'Other'
        totalRevenue += rev
        totalCost    += cost
        catRevenue[cat] = (catRevenue[cat] ?? 0) + rev
        catCost[cat]    = (catCost[cat]    ?? 0) + cost
      }
    }

    const grossMarginPct = totalRevenue > 0
      ? parseFloat(((totalRevenue - totalCost) / totalRevenue * 100).toFixed(1))
      : 0

    // Category margins
    const categoryMargins = Object.keys(catRevenue).map(cat => ({
      category:   cat,
      revenue:    parseFloat(catRevenue[cat].toFixed(3)),
      margin_pct: catRevenue[cat] > 0
        ? parseFloat(((catRevenue[cat] - (catCost[cat] ?? 0)) / catRevenue[cat] * 100).toFixed(1))
        : 0,
    })).sort((a, b) => b.revenue - a.revenue)

    // Low stock alerts
    const lowStock = products
      .filter(p => (p.stock_quantity ?? 0) < 10 && p.item_code)
      .slice(0, 10)
      .map(p => `${p.name} (${p.stock_quantity} units)`)

    // Build CFO context for Sonnet
    const context = {
      period: 'last_30_days',
      revenue_30d:       parseFloat(revenue30.toFixed(3)),
      revenue_prev_30d:  parseFloat(revenue60.toFixed(3)),
      revenue_growth_pct: revenueGrowth,
      orders_30d:        orders30.length,
      gross_margin_pct:  grossMarginPct,
      category_margins:  categoryMargins,
      low_stock_items:   lowStock,
      total_products:    products.length,
    }

    const storeCtx = await getStoreContext()
    const prompt = `You are CFO of ${storeCtx.storeName}, a global AI commerce platform.
Analyze the following 30-day financial data and produce exactly 4 concise CFO insights.
Each insight must be actionable and specific. Return a JSON array of 4 strings only, no markdown.

Data: ${JSON.stringify(context, null, 2)}`

    const raw = await callSonnet(prompt, `You are CFO of ${storeCtx.storeName}, a global AI commerce platform. Return only valid JSON arrays with no markdown.`)
    let insights: string[] = []
    try {
      const cleaned = raw.replace(/```json\n?|```/g, '').trim()
      insights = JSON.parse(cleaned)
      if (!Array.isArray(insights)) insights = [raw]
    } catch {
      insights = [raw]
    }

    // Write each insight to Nexa_Insights
    await Promise.all(insights.slice(0, 4).map(text => writeInsight(String(text))))

    // Revenue leak check — products with capital > $50 and < 2 orders in 30 days
    let leakInsights: string[] = []
    try {
      const deadStockProducts = products
        .filter(p => {
          const code  = p.item_code ?? ''
          const stock = p.stock_quantity ?? 0
          const cost  = p.cost_price ?? 0
          const sold  = (() => {
            let units = 0
            for (const order of orders30) {
              try {
                const items: Array<{ item_code?: string; quantity?: number }> = JSON.parse(order.items ?? '[]')
                for (const item of items) {
                  if (item.item_code === code) units += item.quantity ?? 1
                }
              } catch {}
            }
            return units
          })()
          return stock * cost > 50 && sold < 2
        })
        .slice(0, 20)
        .map(p => ({
          item_code:       p.item_code,
          name:            p.name,
          category:        p.category,
          stock:           p.stock_quantity ?? 0,
          cost_price:      p.cost_price ?? 0,
          capital_tied_up: parseFloat(((p.stock_quantity ?? 0) * (p.cost_price ?? 0)).toFixed(3)),
          orders_30d:      0,
        }))

      if (deadStockProducts.length > 0) {
        const leaks = await runRevenuLeakAgent(deadStockProducts)
        for (const leak of leaks) {
          await atCreate('Nexa_Insights', {
            insight_id:      nanoid(),
            insight_type:    'revenue_leak',
            insight_text:    leak.insight_text,
            action_required: leak.action_required,
            priority:        String(leak.priority ?? '2'),
            status:          'new',
            data_window:     'last_30_days',
          })
        }
        leakInsights = leaks.map(l => l.insight_text)
      }
    } catch (leakErr) {
      console.error('[CFO] Revenue leak check failed:', leakErr)
    }

    return NextResponse.json({
      ok:             true,
      insights:       insights.slice(0, 4),
      leak_insights:  leakInsights,
      context,
    })
  } catch (err) {
    console.error('[CFO] Error:', err)
    return NextResponse.json({ error: 'CFO analysis failed' }, { status: 500 })
  }
}
