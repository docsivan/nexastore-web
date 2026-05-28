import { NextRequest, NextResponse } from 'next/server'
import { getAllOrders, getLowStockProducts } from '@/lib/airtable'
export const dynamic = 'force-dynamic'

function auth(req: NextRequest) {
  return req.cookies.get('adminAuth')?.value === 'true'
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const [orders, lowStock] = await Promise.all([getAllOrders(500), getLowStockProducts(10)])
    const paid  = orders.filter(o => o.fields.payment_status === 'paid')
    const today = new Date().toISOString().slice(0, 10)
    return NextResponse.json({
      stats: {
        total_orders:   orders.length,
        paid_orders:    paid.length,
        pending_orders: orders.filter(o => o.fields.delivery_status === 'processing').length,
        today_orders:   orders.filter(o => (o.fields.created_at || o.createdTime || '').startsWith(today)).length,
        total_revenue:  Math.round(paid.reduce((s, o) => s + (o.fields.total || 0), 0) * 1000) / 1000,
      },
      low_stock: lowStock.map(p => ({
        item_code:      p.fields.item_code,
        name:           p.fields.name,
        brand:          p.fields.brand,
        category:       p.fields.category,
        stock_quantity: p.fields.stock_quantity,
      })),
    })
  } catch (e) {
    console.error('[GET /api/admin/stats]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
