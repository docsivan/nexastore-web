import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function checkAuth(req: NextRequest): boolean {
  return req.cookies.get('adminAuth')?.value === 'true'
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data, error } = await supabase
      .from('ai_promotions')
      .select('*')
      .eq('status', 'active')
      .order('ends_at', { ascending: true })
      .limit(20)

    if (error) return NextResponse.json({ promotions: [] })

    const promotions = (data ?? []).map((r) => ({
      promo_id:          String(r.promo_id          ?? ''),
      item_code:         String(r.item_code         ?? ''),
      // falls back to the base discount_percent column from migration 001
      promo_discount:    Number(r.promo_discount    ?? r.discount_percent ?? 0),
      original_discount: Number(r.original_discount ?? 0),
      starts_at:         String(r.starts_at         ?? ''),
      ends_at:           String(r.ends_at           ?? ''),
      status:            String(r.status            ?? ''),
      approved_by:       String(r.approved_by       ?? ''),
    }))

    return NextResponse.json({ promotions })
  } catch {
    return NextResponse.json({ promotions: [] })
  }
}
