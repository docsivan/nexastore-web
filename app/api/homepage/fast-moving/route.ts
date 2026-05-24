import { NextResponse } from 'next/server'
import { adaptAirtableProducts } from '@/lib/adapters'
import { AirtableProduct, ProductFields } from '@/lib/airtableTypes'

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!

export async function GET() {
  try {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Products`)
    url.searchParams.set(
      'filterByFormula',
      `AND({is_active}=1, {stock_quantity}<10, {stock_quantity}>0)`
    )
    url.searchParams.set('maxRecords', '8')

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      next: { revalidate: 300 },
    })

    if (!res.ok) return NextResponse.json([])
    const data = await res.json()
    const sorted = ((data.records ?? []) as AirtableProduct[]).sort(
      (a, b) =>
        ((a.fields as ProductFields).stock_quantity ?? 0) -
        ((b.fields as ProductFields).stock_quantity ?? 0)
    )
    const products = adaptAirtableProducts(sorted)
    return NextResponse.json(products)
  } catch {
    return NextResponse.json([])
  }
}
