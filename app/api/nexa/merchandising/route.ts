import { NextRequest, NextResponse } from 'next/server'
import { callHaiku } from '@/lib/claude'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { category, topProducts, searches } = await req.json()

    const recs = await callHaiku(
      `Category: ${category ?? 'general'}\nTop searched: ${(searches ?? []).join(', ')}\nTop products: ${(topProducts ?? []).join(', ')}`,
      'You are a AI commerce merchandiser for NexaStore. Return a JSON array of exactly 3 product names the store should prominently feature this week, based on search trends and category. Format: ["Product A","Product B","Product C"]. No explanation, JSON only.'
    )

    let recommendations: string[] = []
    try { recommendations = JSON.parse(recs) } catch { recommendations = [] }

    return NextResponse.json({ recommendations })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
