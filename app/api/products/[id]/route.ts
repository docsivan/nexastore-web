import { NextRequest, NextResponse } from 'next/server'
import { getProductByItemCode } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await getProductByItemCode(params.id)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json({ data: product })
  } catch (error) {
    console.error(`[GET /api/products/${params.id}]`, error)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}
