import { NextRequest, NextResponse } from 'next/server'
import { getProductByItemCode, getOrdersSince } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/** Orders from the last 7 days whose items include this item_code. */
async function fetchRecentOrders(item_code: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const orders = await getOrdersSince(sevenDaysAgo, 100)
  return orders.filter((o) => {
    try {
      const items = JSON.parse(o.fields.items || '[]')
      return Array.isArray(items) && items.some((i) => i?.item_code === item_code)
    } catch {
      return false
    }
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item_code = params.id
    const orders = await fetchRecentOrders(item_code)

    const today = new Date().toISOString().slice(0, 10)
    const ordersThisWeek = orders.length
    const ordersToday = orders.filter((o) =>
      (o.fields.created_at ?? '').startsWith(today)
    ).length

    // Get live stock
    const product = await getProductByItemCode(item_code)
    const stock = product?.fields.stock_quantity ?? 0

    // Generate copy
    let stockCopy = ''
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
