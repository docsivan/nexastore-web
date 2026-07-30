import { NextRequest, NextResponse } from 'next/server'
import { atList, atCreate, atPatch } from '@/lib/ai-tables'

export const dynamic = 'force-dynamic'


function checkAuth(req: NextRequest): boolean {
  const cronSecret = req.headers.get('x-cron-secret')
  return cronSecret === process.env.CRON_SECRET || req.cookies.get('adminAuth')?.value === 'true'
}

async function createJWT(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const header  = { alg: 'RS256', typ: 'JWT' }
  const now     = Math.floor(Date.now() / 1000)
  const payload = {
    iss:   serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  }

  const b64u = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const signingInput = `${b64u(header)}.${b64u(payload)}`

  const pemKey    = serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')
  const keyBuffer = Buffer.from(pemKey, 'base64')

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, Buffer.from(signingInput))
  return `${signingInput}.${Buffer.from(signature).toString('base64url')}`
}

async function getAccessToken(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const jwt = await createJWT(serviceAccount)
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`GSC auth failed: ${JSON.stringify(data)}`)
  return data.access_token
}

/** Refreshes the row for this (query, data_range) pair, or creates it. */
async function upsertRow(row: Record<string, unknown>) {
  const check = await atList('Haya_Search_Console', {
    limit: 1,
    match: { query: row.query, data_range: row.data_range },
  })
  const existing = check.records?.[0]
  if (existing) {
    await atPatch('Haya_Search_Console', existing.id, row)
  } else {
    await atCreate('Haya_Search_Console', row)
  }
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gscKeyJson = process.env.GOOGLE_SEARCH_CONSOLE_KEY_JSON
  if (!gscKeyJson) {
    console.warn('[GSC] GOOGLE_SEARCH_CONSOLE_KEY_JSON not set — skipping')
    return NextResponse.json({ skipped: true, reason: 'GSC key not configured' })
  }

  try {
    const serviceAccount = JSON.parse(gscKeyJson)
    const accessToken    = await getAccessToken(serviceAccount)

    const siteDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'nexastore.io'
    const siteUrl    = process.env.GSC_SITE_URL ?? `sc-domain:${siteDomain}`
    const endDate    = new Date()
    const startDate  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const fmt        = (d: Date) => d.toISOString().split('T')[0]
    const dataRange  = `${fmt(startDate)}:${fmt(endDate)}`

    const gscRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method:  'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          startDate:  fmt(startDate),
          endDate:    fmt(endDate),
          dimensions: ['query', 'page'],
          rowLimit:   1000,
        }),
      }
    )

    if (!gscRes.ok) {
      const err = await gscRes.text()
      return NextResponse.json({ error: `GSC API error: ${err}` }, { status: 500 })
    }

    const gscData = await gscRes.json()
    const rows    = (gscData.rows ?? []) as Array<{
      keys: string[]
      impressions: number
      clicks: number
      ctr: number
      position: number
    }>

    let upserted = 0
    for (const row of rows.slice(0, 200)) {
      const query      = row.keys[0] ?? ''
      const pageUrl    = row.keys[1] ?? ''
      const impressions = row.impressions ?? 0
      const clicks      = row.clicks ?? 0
      const ctr         = row.ctr ?? 0
      const position    = row.position ?? 100

      const opportunityScore = Math.round(impressions * (1 - ctr) * (1 / Math.max(position, 1)))

      await upsertRow({
        query,
        impressions,
        clicks,
        ctr:              parseFloat(ctr.toFixed(4)),
        position:         parseFloat(position.toFixed(1)),
        page_url:         pageUrl,
        opportunity_score: opportunityScore,
        content_exists:   false,
        data_range:       dataRange,
        fetched_at:       new Date().toISOString(),
      })
      upserted++
    }

    return NextResponse.json({ ok: true, upserted, total_rows: rows.length, data_range: dataRange })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[GSC]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
