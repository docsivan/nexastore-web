import { NextResponse } from 'next/server'
import { adaptAirtableProduct } from '@/lib/adapters'
import { OrderFields } from '@/lib/airtableTypes'
import { getOrdersSince, getProductsByItemCodes } from '@/lib/supabase'

export const revalidate = 300

interface TopSeller {
  product: ReturnType<typeof adaptAirtableProduct>
  soldCount: number
}

export async function GET() {
  try {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)

    const orders = await getOrdersSince(cutoff.toISOString(), 500)

    // Count item_code occurrences across all order items
    const counts: Record<string, number> = {}
    for (const order of orders) {
      const fields = order.fields as OrderFields
      try {
        const items = typeof fields.items === 'string' ? JSON.parse(fields.items) : fields.items
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item?.item_code) {
              counts[item.item_code] = (counts[item.item_code] ?? 0) + (item.quantity ?? 1)
            }
          }
        }
      } catch {
        // skip malformed items
      }
    }

    // Sort by count desc, take top 8
    const topCodes = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([code]) => code)

    if (topCodes.length === 0) return NextResponse.json([])

    const productRecords = await getProductsByItemCodes(topCodes, 8)

    const results: TopSeller[] = productRecords
      .map((r) => ({
        product: adaptAirtableProduct(r),
        soldCount: counts[r.fields.item_code] ?? 0,
      }))
      .sort((a, b) => b.soldCount - a.soldCount)

    return NextResponse.json(results)
  } catch {
    return NextResponse.json([])
  }
}
