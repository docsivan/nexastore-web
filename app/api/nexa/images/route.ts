import { NextRequest, NextResponse } from 'next/server'
import { atList, atCreate, atPatch } from '@/lib/ai-tables'

export const dynamic = 'force-dynamic'


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

export async function GET(req: NextRequest) {
  const authHeader   = req.headers.get('authorization')
  const isAdmin      = req.headers.get('x-admin-pin')
  const isManual     = req.nextUrl.searchParams.get('manual') === '1'

  // Allow: cron secret, x-admin-pin header, or ?manual=1 (admin panel button)
  if (!isManual && !isAdmin && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Up to 10 active products that have no image yet
  const listData = await atList('Products', { limit: 200, match: { is_active: true } })
  const records: Array<{ id: string; name?: string; category?: string; brand?: string; item_code?: string; image_url?: string }> =
    (listData.records ?? [])
      .filter((r) => !r.image_url)
      .slice(0, 10)

  if (records.length === 0) {
    return NextResponse.json({ updated: 0, message: 'No products need images' })
  }

  const results: { item_code: string; url: string; source: string }[] = []

  for (const record of records) {
    const category = (record.category ?? '').toLowerCase().replace(/\s+/g, '-')
    const imgUrl   = CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES['default']

    // Persist the image URL
    const patched = await atPatch('Products', record.id, { image_url: imgUrl })

    if (patched) {
      results.push({
        item_code: record.item_code ?? record.id,
        url:       imgUrl,
        source:    'unsplash',
      })

      // Log to ai_log
      await atCreate('Nexa_Log', {
        timestamp:    new Date().toISOString(),
        trigger_type: 'image',
        action:       'assign_image',
        target:       record.item_code ?? record.id,
        field:        'image_url',
        value:        imgUrl,
        reason:       'Product had no image',
        status:       'applied',
      })
    }
  }

  return NextResponse.json({ updated: results.length, results })
}
