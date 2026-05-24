import { NextResponse } from 'next/server'
import { adaptAirtableProducts } from '@/lib/adapters'
import { AirtableProduct } from '@/lib/airtableTypes'

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!

export async function GET() {
  try {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Products`)
    url.searchParams.set('filterByFormula', `AND({is_active}=1, {discount_percent}>0)`)
    url.searchParams.set('sort[0][field]', 'discount_percent')
    url.searchParams.set('sort[0][direction]', 'desc')
    url.searchParams.set('maxRecords', '8')

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      next: { revalidate: 300 },
    })

    if (!res.ok) return NextResponse.json([])
    const data = await res.json()
    const products = adaptAirtableProducts((data.records ?? []) as AirtableProduct[])
    return NextResponse.json(products)
  } catch {
    return NextResponse.json([])
  }
}
