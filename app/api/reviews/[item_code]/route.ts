import { NextRequest, NextResponse } from 'next/server'
import { getPublishedReviews } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface Params {
  params: { item_code: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { item_code } = params
  if (!item_code) return NextResponse.json({ error: 'item_code required' }, { status: 400 })

  try {
    const records = await getPublishedReviews(item_code, 50)

    const reviews = records.map((r) => ({
      id:                String(r.id),
      review_id:         String(r.review_id ?? ''),
      customer_id:       String(r.customer_id ?? ''),
      rating:            Number(r.rating ?? 0),
      review_text:       String(r.review_text ?? ''),
      verified_purchase: Boolean(r.verified_purchase ?? false),
      created_at:        String(r.created_at ?? ''),
    }))

    const count = reviews.length
    const averageRating = count > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
      : 0

    return NextResponse.json({ reviews, averageRating, count })
  } catch {
    return NextResponse.json({ reviews: [], averageRating: 0, count: 0 })
  }
}
