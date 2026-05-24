import { NextRequest, NextResponse } from 'next/server'
import { generateContent } from '@/lib/gemini'
import { AirtableOrder, AirtableProduct, OrderFields, ProductFields } from '@/lib/airtableTypes'

export const dynamic = 'force-dynamic'

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!
const ADMIN_PIN = process.env.ADMIN_PIN!

function checkAuth(req: NextRequest): boolean {
  return req.headers.get('x-admin-pin') === ADMIN_PIN
}

async function fetchAirtable<T>(table: string, params: URLSearchParams): Promise<T[]> {
  const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`)
  url.search = params.toString()
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.records ?? []
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

    // Yesterday's orders
    const yOrders = await fetchAirtable<AirtableOrder>('Orders', new URLSearchParams({
      filterByFormula: `AND(IS_AFTER({created_at},'${yStart}'), IS_BEFORE({created_at},'${today.toISOString().slice(0, 10)}'))`,
      maxRecords: '500',
    }))

    const yRevenue = yOrders.reduce((s, o) => s + ((o.fields as OrderFields).total ?? 0), 0)
    const pendingDispatch = yOrders.filter(o => (o.fields as OrderFields).delivery_status === 'processing').length

    // Low stock
    const lowStock = await fetchAirtable<AirtableProduct>('Products', new URLSearchParams({
      filterByFormula: `AND({is_active}=1,{stock_quantity}<10,{stock_quantity}>0)`,
      maxRecords: '20',
    }))

    const lowStockList = lowStock.map(p => ({
      name: (p.fields as ProductFields).name,
      item_code: (p.fields as ProductFields).item_code,
      stock: (p.fields as ProductFields).stock_quantity,
    }))

    // Top 5 products last 7 days
    const last7Orders = await fetchAirtable<AirtableOrder>('Orders', new URLSearchParams({
      filterByFormula: `IS_AFTER({created_at},'${last7Start}')`,
      maxRecords: '500',
    }))

    const counts: Record<string, { name: string; count: number }> = {}
    for (const order of last7Orders) {
      const f = order.fields as OrderFields
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

Yesterday: ${data.yesterday_orders} orders, OMR ${data.yesterday_revenue.toFixed(3)} revenue
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
