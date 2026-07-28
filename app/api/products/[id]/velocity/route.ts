import { NextRequest, NextResponse } from 'next/server'
import { getProducts } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Re-use the base fetch from airtable client directly
const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!

async function fetchRecentOrders(item_code: string) {
  // Fetch orders from last 7 days that contain this item_code
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/Orders`)
  // Search for item_code in items JSON string field
  url.searchParams.set('filterByFormula', `FIND("${item_code}",{items})`)
  url.searchParams.set('fields[]', 'order_id')
  url.searchParams.set('fields[]', 'created_at')
  url.searchParams.set('pageSize', '100')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${API_KEY}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.records ?? []).filter((r: { fields: { created_at: string } }) => {
    return r.fields.created_at >= sevenDaysAgo
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item_code = params.id
    const orders = await fetchRecentOrders(item_code)

    const ordersThisWeek = orders.length
    const ordersToday    = orders.filter((r: { fields: { created_at: string } }) => {
      const today = new Date().toISOString().slice(0, 10)
      return r.fields.created_at?.startsWith(today)
    }).length

    // Get live stock
    const products = await getProducts()
    const product  = products.find((p) => p.fields.item_code === item_code)
    const stock    = product?.fields.stock_quantity ?? 0

    // Generate copy
    let stockCopy  = ''
    let velocityCopy = ''

    if (stock === 0) {
      stockCopy = 'Currently out of stock'
    } else if (stock <= 5) {
      stockCopy = `Only ${stock} units left in warehouse`
    } else if (stock <= 20) {
      stockCopy = `Last ${stock} units in local warehouse`
    } else if (stock <= 50) {
      stockCopy = `${stock} units available — low stock`
    }

    if (ordersToday >= 3) {
      velocityCopy = `${ordersToday} facilities ordered this today`
    } else if (ordersThisWeek >= 5) {
      velocityCopy = `${ordersThisWeek} facilities ordered this week`
    } else if (ordersThisWeek >= 2) {
      velocityCopy = `${ordersThisWeek} facilities ordered this week`
    }

    return NextResponse.json({
      item_code,
      stock,
      ordersToday,
      ordersThisWeek,
      stockCopy,
      velocityCopy,
    })
  } catch (error) {
    console.error('[GET velocity]', error)
    return NextResponse.json({ stockCopy: '', velocityCopy: '', ordersThisWeek: 0 })
  }
}
