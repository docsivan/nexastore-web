import { NextResponse } from 'next/server'
import { adaptAirtableProducts } from '@/lib/adapters'
import { getNewArrivals } from '@/lib/supabase'

export const revalidate = 300

export async function GET() {
  try {
    const records = await getNewArrivals(30, 8)
    return NextResponse.json(adaptAirtableProducts(records))
  } catch {
    return NextResponse.json([])
  }
}
