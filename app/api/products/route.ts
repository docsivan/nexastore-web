import { NextResponse } from 'next/server'
import { getProducts } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const products = await getProducts()
    return NextResponse.json(
      { data: products, total: products.length },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    )
  } catch (error) {
    console.error('[GET /api/products]', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
