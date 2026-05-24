import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

const ERP_ORIGIN = 'https://erp.hospitalshop.com'
const AUTH = 'Basic ' + Buffer.from(`${process.env.ERP_USER}:${process.env.ERP_API_KEY}`).toString('base64')

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get('url')
  const code   = req.nextUrl.searchParams.get('code') ?? 'product'

  if (!rawUrl) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  let parsed: URL
  try { parsed = new URL(rawUrl) } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }
  if (parsed.origin !== ERP_ORIGIN)
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 400 })

  // ETag / 304 short-circuit
  const etag = `"${code}"`
  if (req.headers.get('if-none-match') === etag)
    return new Response(null, { status: 304, headers: { ETag: etag } })

  let erpRes: Response
  try {
    erpRes = await fetch(rawUrl, { headers: { Authorization: AUTH }, redirect: 'follow' })
  } catch {
    return NextResponse.json({ error: 'ERP unreachable' }, { status: 502 })
  }
  if (!erpRes.ok)
    return NextResponse.json({ error: `ERP ${erpRes.status}` }, { status: 502 })

  const buf = await erpRes.arrayBuffer()
  // Not calling .withMetadata() strips all EXIF/GPS/copyright metadata by default
  const webp = await sharp(Buffer.from(buf))
    .resize(600, 600, { fit: 'inside' })
    .webp({ quality: 72 })
    .toBuffer()

  const filename = `hayat-supplies-${code}-oman.webp`

  return new Response(new Uint8Array(webp), {
    headers: {
      'Content-Type':        'image/webp',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control':       'public, max-age=604800, immutable',
      'ETag':                etag,
      'X-Robots-Tag':        'index, imageindex',
    },
  })
}
