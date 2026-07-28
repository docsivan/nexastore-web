import { NextRequest, NextResponse } from 'next/server'
import { getProducts } from '@/lib/supabase'
import { aiSearchProducts, ProductSummary } from '@/lib/gemini'
import { adaptAirtableProducts } from '@/lib/adapters'

export const dynamic = 'force-dynamic'

// ─── 5-minute server-side product cache ──────────────────────────────────────
let cachedProducts: Awaited<ReturnType<typeof getProducts>> = []
let cacheExpiry = 0

async function getCachedProducts() {
  const now = Date.now()
  if (cachedProducts.length === 0 || now > cacheExpiry) {
    cachedProducts = await getProducts()
    cacheExpiry = now + 5 * 60 * 1000 // 5 minutes
  }
  return cachedProducts
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (!q || q.length < 2) {
    return NextResponse.json({ data: [], query: '', total: 0 })
  }

  try {
    // Use cached products — no Airtable call on every keystroke
    const airtableProducts = await getCachedProducts()

    // Build condensed catalogue for Gemini
    const catalogue: ProductSummary[] = airtableProducts.map((p) => ({
      item_code: p.fields.item_code,
      name:      p.fields.name,
      category:  p.fields.category,
      brand:     p.fields.brand,
      pack_size: p.fields.pack_size,
    }))

    // Ask Gemini to find matching item_codes
    const matchedCodes = await aiSearchProducts(q, catalogue)

    if (matchedCodes.length === 0) {
      return NextResponse.json({
        data:    [],
        query:   q,
        total:   0,
        ai:      true,
        message: `We currently don't carry "${q}" in our catalogue. Please contact us on WhatsApp and we will source it for you.`,
      })
    }

    // Map matched codes to products
    const productMap = new Map(airtableProducts.map((p) => [p.fields.item_code, p]))
    const matched = matchedCodes
      .map((code) => productMap.get(code))
      .filter(Boolean) as typeof airtableProducts

    const results = adaptAirtableProducts(matched)

    return NextResponse.json({
      data:  results,
      query: q,
      total: results.length,
      ai:    true,
    })

  } catch (error) {
    console.error('[GET /api/search]', error)

    // Fallback: instant local keyword search if Gemini fails
    try {
      const airtableProducts = await getCachedProducts()
      const ql = q.toLowerCase()
      const fallback = airtableProducts.filter((p) =>
        p.fields.name?.toLowerCase().includes(ql) ||
        p.fields.brand?.toLowerCase().includes(ql) ||
        p.fields.category?.toLowerCase().includes(ql)
      )
      return NextResponse.json({
        data:  adaptAirtableProducts(fallback).slice(0, 8),
        query: q,
        total: fallback.length,
        ai:    false,
      })
    } catch {
      return NextResponse.json({ data: [], query: q, total: 0, ai: false })
    }
  }
}
