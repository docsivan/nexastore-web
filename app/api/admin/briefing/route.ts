import { NextRequest, NextResponse } from 'next/server'
import { generateContent } from '@/lib/gemini'
import { OrderFields, ProductFields } from '@/lib/airtableTypes'
import { getOrdersSince, getFastMovingProducts } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function checkAuth(req: NextRequest): boolean {
  return req.cookies.get('adminAuth')?.value === 'true'
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const yStart = yesterday.toISOString().slice(0, 10)
    const last7 = new Date(today)
    last7.setDate(today.getDate() - 7)
    const last7Start = last7.toISOString().slice(0, 10)

    // Yesterday's orders — fetched from yStart, then bounded to before today
    const todayStart = today.toISOString().slice(0, 10)
    const yOrders = (await getOrdersSince(yStart, 500)).filter((o) => {
      const created = String((o as unknown as OrderFields).created_at ?? o.createdTime ?? '')
      return created >= yStart && created < todayStart
    })

    const yRevenue = yOrders.reduce((s, o) => s + ((o as unknown as OrderFields).total ?? 0), 0)
    const pendingDispatch = yOrders.filter(o => (o as unknown as OrderFields).delivery_status === 'processing').length

    // Low stock
    const lowStock = await getFastMovingProducts(10, 20)

    const lowStockList = lowStock.map(p => ({
      name: (p as unknown as ProductFields).name,
      item_code: (p as unknown as ProductFields).item_code,
      stock: (p as unknown as ProductFields).stock_quantity,
    }))

    // Top 5 products last 7 days
    const last7Orders = await getOrdersSince(last7Start, 500)

    const counts: Record<string, { name: string; count: number }> = {}
    for (const order of last7Orders) {
      const f = order as OrderFields
      try {
        const items = typeof f.items === 'string' ? JSON.parse(f.items) : f.items
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item?.item_code) {
              counts[item.item_code] = {
                name: item.name ?? item.item_code,
                count: (counts[item.item_code]?.count ?? 0) + (item.quantity ?? 1),
              }
            }
          }
        }
      } catch {}
    }

    const top5 = Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const data = {
      yesterday_orders: yOrders.length,
      yesterday_revenue: Math.round(yRevenue * 1000) / 1000,
      pending_dispatch: pendingDispatch,
      low_stock: lowStockList,
      top_products: top5,
    }

    const prompt = `You are Haya, AI Business Owner of NexaStore.
Write a concise morning briefing for the owner based on this data:

Yesterday: ${data.yesterday_orders} orders, \${data.yesterday_revenue.toFixed(2)} revenue
Pending dispatch: ${data.pending_dispatch} orders
Low stock items (${data.low_stock.length}): ${data.low_stock.map(i => `${i.name} (${i.stock} left)`).join(', ') || 'none'}
Top products last 7 days: ${data.top_products.map(p => `${p.name} (${p.count} units)`).join(', ') || 'no data'}

End with ONE specific action recommendation.`

    const briefing = await generateContent(prompt, 0.5, 512)

    return NextResponse.json({ briefing, data })
  } catch {
    return NextResponse.json({ briefing: 'Unable to generate briefing at this time.', data: null })
  }
}
