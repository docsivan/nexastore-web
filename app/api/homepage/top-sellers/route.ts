import { NextResponse } from 'next/server'
import { adaptAirtableProduct } from '@/lib/adapters'
import { AirtableProduct, AirtableOrder, OrderFields } from '@/lib/airtableTypes'

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!

interface TopSeller {
  product: ReturnType<typeof adaptAirtableProduct>
  soldCount: number
}

async function fetchAirtable<T>(table: string, params: URLSearchParams): Promise<T[]> {
  const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`)
  url.search = params.toString()
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    next: { revalidate: 300 },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.records ?? []
}

export async function GET() {
  try {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)
    const cutoffStr = cutoff.toISOString().slice(0, 10)

    const orderParams = new URLSearchParams({
      filterByFormula: `IS_AFTER({created_at}, '${cutoffStr}')`,
      maxRecords: '500',
    })
    const orders = await fetchAirtable<AirtableOrder>('Orders', orderParams)

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

    // Fetch those products
    const formula = `AND({is_active}=1, OR(${topCodes.map(c => `{item_code}='${c}'`).join(',')}))`
    const productParams = new URLSearchParams({ filterByFormula: formula, maxRecords: '8' })
    const productRecords = await fetchAirtable<AirtableProduct>('Products', productParams)

    const results: TopSeller[] = productRecords
      .map(r => ({
        product: adaptAirtableProduct(r),
        soldCount: counts[r.fields.item_code] ?? 0,
      }))
      .sort((a, b) => b.soldCount - a.soldCount)

    return NextResponse.json(results)
  } catch {
    return NextResponse.json([])
  }
}
