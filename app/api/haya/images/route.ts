import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

// Direct stable Unsplash photo IDs — source.unsplash.com is deprecated (404s)
const CATEGORY_IMAGES: Record<string, string> = {
  'infection-control': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop&auto=format',
  'dental-supplies':   'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=400&fit=crop&auto=format',
  'ppe':               'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=400&h=400&fit=crop&auto=format',
  'diagnostics':       'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&auto=format',
  'sterilization':     'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&h=400&fit=crop&auto=format',
  'medical-devices':   'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400&h=400&fit=crop&auto=format',
  'default':           'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=400&fit=crop&auto=format',
}

function atHeaders() {
  return {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }
}

export async function GET(req: NextRequest) {
  const authHeader   = req.headers.get('authorization')
  const isAdmin      = req.headers.get('x-admin-pin')
  const isManual     = req.nextUrl.searchParams.get('manual') === '1'

  // Allow: cron secret, x-admin-pin header, or ?manual=1 (admin panel button)
  if (!isManual && !isAdmin && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!API_KEY || !BASE_ID) {
    return NextResponse.json({ error: 'Airtable not configured' }, { status: 500 })
  }

  // Fetch up to 10 products with no image_url
  const filterFormula = encodeURIComponent(`AND({is_active}=1, OR({image_url}="", {image_url}=BLANK()))`)
  const listUrl = `${AT_BASE}/Products?maxRecords=10&filterByFormula=${filterFormula}`

  const listRes = await fetch(listUrl, { headers: atHeaders() })
  if (!listRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }

  const listData = await listRes.json()
  const records: { id: string; fields: { name?: string; category?: string; brand?: string; item_code?: string } }[] =
    listData.records ?? []

  if (records.length === 0) {
    return NextResponse.json({ updated: 0, message: 'No products need images' })
  }

  const results: { item_code: string; url: string; source: string }[] = []

  for (const record of records) {
    const category = (record.fields.category ?? '').toLowerCase().replace(/\s+/g, '-')
    const imgUrl   = CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES['default']

    // PATCH image_url back to Airtable
    const patchRes = await fetch(`${AT_BASE}/Products/${record.id}`, {
      method: 'PATCH',
      headers: atHeaders(),
      body: JSON.stringify({ fields: { image_url: imgUrl } }),
    })

    if (patchRes.ok) {
      results.push({
        item_code: record.fields.item_code ?? record.id,
        url:       imgUrl,
        source:    'unsplash',
      })

      // Log to Haya_Log
      await fetch(`${AT_BASE}/Haya_Log`, {
        method: 'POST',
        headers: atHeaders(),
        body: JSON.stringify({
          fields: {
            timestamp:    new Date().toISOString(),
            trigger_type: 'image',
            action:       'assign_image',
            target:       record.fields.item_code ?? record.id,
            field:        'image_url',
            value:        imgUrl,
            reason:       'Product had no image',
            status:       'applied',
          },
        }),
      }).catch(() => {})
    }
  }

  return NextResponse.json({ updated: results.length, results })
}
