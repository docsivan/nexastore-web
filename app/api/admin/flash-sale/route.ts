import { NextRequest, NextResponse } from 'next/server'
import { updateProductById } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function checkAuth(req: NextRequest): boolean {
  return req.cookies.get('adminAuth')?.value === 'true'
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { record_id, discount_percent, sale_start, sale_end, cancel } = await req.json()
    if (!record_id) return NextResponse.json({ error: 'record_id required' }, { status: 400 })

    const fields: Record<string, unknown> = {}

    if (cancel) {
      fields.discount_percent = 0
    } else {
      if (discount_percent !== undefined) fields.discount_percent = Number(discount_percent)
      const saleMeta = { sale_start: sale_start ?? null, sale_end: sale_end ?? null }
      fields.notes = JSON.stringify(saleMeta)
    }

    await updateProductById(record_id, fields)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
