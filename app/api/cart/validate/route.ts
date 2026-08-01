import { NextRequest, NextResponse } from 'next/server'
import { getProductByItemCode } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface CartInput {
  productId: string   // = item_code
  quantity: number
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { items } = body as { items: CartInput[] }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid cart items' }, { status: 400 })
    }

    const validated = await Promise.all(
      items.map(async (item) => {
        const record = await getProductByItemCode(item.productId)

        if (!record) {
          return { ...item, valid: false, reason: 'Product not found' }
        }

        const f = record

        if (!f.is_active) {
          return { ...item, valid: false, reason: 'Product is no longer available' }
        }

        if (f.stock_quantity <= 0) {
          return { ...item, valid: false, reason: 'Out of stock' }
        }

        if (item.quantity > f.stock_quantity) {
          return {
            ...item,
            valid: true,
            quantity: f.stock_quantity,
            final_price: f.final_price,
            reason: `Quantity adjusted to available stock (${f.stock_quantity})`,
          }
        }

        return {
          ...item,
          valid: true,
          final_price: f.final_price,
          stock_quantity: f.stock_quantity,
        }
      })
    )

    const allValid = validated.every((i) => i.valid)
    return NextResponse.json({ valid: allValid, items: validated })
  } catch (error) {
    console.error('[POST /api/cart/validate]', error)
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 })
  }
}
