import { NextRequest, NextResponse } from 'next/server'
import { adaptAirtableProducts } from '@/lib/adapters'
import { AirtableOrder, AirtableProduct, OrderFields } from '@/lib/airtableTypes'

export const dynamic = 'force-dynamic'

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!

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
  const phone = req.nextUrl.searchParams.get('phone')
  if (!phone) return NextResponse.json([])

  try {
    // Fetch customer's last 5 orders
    const orders = await fetchAirtable<AirtableOrder>('Orders', new URLSearchParams({
      filterByFormula: `{phone}='${phone.replace(/'/g, "\\'")}'`,
      sort: JSON.stringify([{ field: 'created_at', direction: 'desc' }]),
      maxRecords: '5',
    }))

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

    const formula = `AND({is_active}=1, OR(${topCats.map(c => `{category}='${c}'`).join(',')}))`
    const products = await fetchAirtable<AirtableProduct>('Products', new URLSearchParams({
      filterByFormula: formula,
      maxRecords: '8',
    }))

    return NextResponse.json(adaptAirtableProducts(products))
  } catch {
    return NextResponse.json([])
  }
}
