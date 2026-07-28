import { NextRequest, NextResponse } from 'next/server'
import { ProductFields } from '@/lib/airtableTypes'
import { getProductsByStock, updateProductById } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function checkAuth(req: NextRequest): boolean {
  return req.cookies.get('adminAuth')?.value === 'true'
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const records = await getProductsByStock(200)

    const products = records.map((r) => {
      const f = r.fields as ProductFields
      return {
        // record_id is the Supabase row id; PATCH below expects it back
        record_id:      r.id,
        item_code:      f.item_code,
        name:           f.name,
        brand:          f.brand,
        category:       f.category,
        stock_quantity: f.stock_quantity ?? 0,
        is_active:      f.is_active,
        final_price:    f.final_price,
      }
    })

    return NextResponse.json({ products })
  } catch {
    return NextResponse.json({ products: [] })
  }
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { record_id, stock_quantity, is_active } = await req.json()
    if (!record_id) return NextResponse.json({ error: 'record_id required' }, { status: 400 })

    const fields: Record<string, unknown> = {}
    if (stock_quantity !== undefined) fields.stock_quantity = Number(stock_quantity)
    if (is_active !== undefined) fields.is_active = is_active

    await updateProductById(record_id, fields)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
