import { NextRequest, NextResponse } from 'next/server'
import { adaptAirtableProducts } from '@/lib/adapters'
import { OrderFields } from '@/lib/airtableTypes'
import { getOrdersByPhone, getProductsByCategories } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone')
  if (!phone) return NextResponse.json([])

  try {
    // Customer's last 5 orders (getOrdersByPhone is already newest-first)
    const orders = (await getOrdersByPhone(phone)).slice(0, 5)

    // Count category occurrences
    const catCounts: Record<string, number> = {}
    for (const order of orders) {
      const f = order.fields as OrderFields
      try {
        const items = typeof f.items === 'string' ? JSON.parse(f.items) : f.items
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item?.category) catCounts[item.category] = (catCounts[item.category] ?? 0) + 1
          }
        }
      } catch {}
    }

    const topCats = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([cat]) => cat)

    if (topCats.length === 0) return NextResponse.json([])

    const products = await getProductsByCategories(topCats, 8)
    return NextResponse.json(adaptAirtableProducts(products))
  } catch {
    return NextResponse.json([])
  }
}
