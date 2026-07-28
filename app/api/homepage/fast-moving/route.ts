import { NextResponse } from 'next/server'
import { adaptAirtableProducts } from '@/lib/adapters'
import { getFastMovingProducts } from '@/lib/supabase'

export const revalidate = 300

export async function GET() {
  try {
    const records = await getFastMovingProducts(10, 8)
    return NextResponse.json(adaptAirtableProducts(records))
  } catch {
    return NextResponse.json([])
  }
}
