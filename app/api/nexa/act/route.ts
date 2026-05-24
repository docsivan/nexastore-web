import { guardCronRoute } from '@/lib/admin-guard'
import { NextRequest, NextResponse } from 'next/server'
import {
  handleReorderReminder,
  handleMerchandisingUpdate,
  handleStockAlert,
  handleConversionIntervention,
  handleSearchGap,
  HayaInsight,
} from '@/lib/nexa-actions'

// ── Promotion helpers ────────────────────────────────────────────────────────

function promoId(): string {
  return `promo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function handlePromotion(insight: HayaInsight, apiKey: string, baseId: string) {
  const AT = `https://api.airtable.com/v0/${baseId}`
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
  const itemCode = insight.item_code
  if (!itemCode) return

  // Extract discount % from action_required or insight text
  const text = (insight.action_required ?? '') + ' ' + (insight.insight ?? '')
  const discountMatch = text.match(/(\d{1,3})\s*%/)
  const promoDiscount = discountMatch ? parseInt(discountMatch[1]) : 10

  // Fetch current product
  const formula = encodeURIComponent(`{item_code}="${itemCode}"`)
  const prodRes = await fetch(
    `${AT}/Products?filterByFormula=${formula}&maxRecords=1&fields[]=item_code&fields[]=discount_percent&fields[]=haya_badge`,
    { headers: { Authorization: `Bearer ${apiKey}` }, cache: 'no-store' }
  )
  if (!prodRes.ok) return
  const prodData   = await prodRes.json()
  const prodRecord = prodData.records?.[0]
  if (!prodRecord) return

  const originalDiscount = Number(prodRecord.fields.discount_percent ?? 0)
  const now     = new Date()
  const endsAt  = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  // PATCH product: new discount + SALE badge
  await fetch(`${AT}/Products/${prodRecord.id}`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ fields: { discount_percent: promoDiscount, haya_badge: 'SALE' } }),
  })

  // Write Haya_Promotions record
  await fetch(`${AT}/Haya_Promotions`, {
    method: 'POST', headers,
    body: JSON.stringify({
      fields: {
        promo_id:          promoId(),
        item_code:         itemCode,
        original_discount: originalDiscount,
        promo_discount:    promoDiscount,
        starts_at:         now.toISOString().split('T')[0],
        ends_at:           endsAt.toISOString().split('T')[0],
        status:            'active',
        approved_by:       'owner',
      },
    }),
  })
}

async function expirePromotions(apiKey: string, baseId: string) {
  const AT = `https://api.airtable.com/v0/${baseId}`
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }

  const todayStr = new Date().toISOString().split('T')[0]
  const formula  = encodeURIComponent(
    `AND({status}="active",IS_BEFORE({ends_at},"${todayStr}"))`
  )
  const res = await fetch(
    `${AT}/Haya_Promotions?filterByFormula=${formula}&maxRecords=50`,
    { headers: { Authorization: `Bearer ${apiKey}` }, cache: 'no-store' }
  )
  if (!res.ok) return

  const data = await res.json()
  for (const rec of (data.records ?? []) as Array<{ id: string; fields: { item_code?: string; original_discount?: number } }>) {
    const itemCode = rec.fields.item_code
    if (itemCode) {
      // Restore original discount and clear badge
      const formula2  = encodeURIComponent(`{item_code}="${itemCode}"`)
      const prodRes   = await fetch(
        `${AT}/Products?filterByFormula=${formula2}&maxRecords=1`,
        { headers: { Authorization: `Bearer ${apiKey}` }, cache: 'no-store' }
      )
      if (prodRes.ok) {
        const prodData   = await prodRes.json()
        const prodRecord = prodData.records?.[0]
        if (prodRecord) {
          await fetch(`${AT}/Products/${prodRecord.id}`, {
            method: 'PATCH', headers,
            body: JSON.stringify({
              fields: {
                discount_percent: rec.fields.original_discount ?? 0,
                haya_badge:       '',
              },
            }),
          })
        }
      }
    }
    // Mark promo as expired
    await fetch(`${AT}/Haya_Promotions/${rec.id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ fields: { status: 'expired' } }),
    })
  }
}

export const dynamic = 'force-dynamic'

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

async function fetchHighPriorityInsights(): Promise<HayaInsight[]> {
  const formula = encodeURIComponent(`AND({status}='new',{priority}>=4)`)
  const url     = `${AT_BASE}/Nexa_Insights?filterByFormula=${formula}&sort[0][field]=priority&sort[0][direction]=desc&maxRecords=20`
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return (data.records ?? []).map((r: { id: string; fields: Record<string, unknown> }) => ({
      id:              r.id,
      insight_id:      String(r.fields.insight_id      ?? ''),
      package:         String(r.fields.package         ?? ''),
      insight_type:    String(r.fields.insight_type    ?? r.fields.package ?? ''),
      insight:         String(r.fields.insight         ?? ''),
      priority:        Number(r.fields.priority        ?? 0),
      status:          String(r.fields.status          ?? ''),
      action_required: String(r.fields.action_required ?? ''),
      item_code:       r.fields.item_code   ? String(r.fields.item_code)   : undefined,
      customer_id:     r.fields.customer_id ? String(r.fields.customer_id) : undefined,
    }))
  } catch {
    return []
  }
}

async function patchStatus(id: string, status: string) {
  await fetch(`${AT_BASE}/Nexa_Insights/${id}`, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ fields: { status } }),
  }).catch(() => {})
}

export async function GET(req: NextRequest) {
  const g = guardCronRoute(req)
  if (g.rateLimitResponse) return g.rateLimitResponse
  if (!g.authorized) return new Response('Unauthorized', { status: 401 })
  const authHeader = req.headers.get('authorization')
  const isAdmin    = req.headers.get('x-admin-pin')
  if (!isAdmin && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!API_KEY || !BASE_ID) {
    return NextResponse.json({ error: 'Airtable not configured' }, { status: 500 })
  }

  // Run expiry check on every act cycle
  await expirePromotions(API_KEY, BASE_ID).catch(() => {})

  const insights = await fetchHighPriorityInsights()
  if (insights.length === 0) {
    return NextResponse.json({ ok: true, actioned: 0, reason: 'no high-priority insights' })
  }

  const results:        Record<string, string> = {}
  const pendingApproval: string[]              = []

  for (const insight of insights) {
    const type = insight.insight_type || insight.package
    try {
      if (type === 'search_gap' || type === 'search_gaps') {
        await handleSearchGap(insight)
        await patchStatus(insight.id, 'actioned')
        results[insight.insight_id] = 'actioned:search_gap'

      } else if (type === 'conversion_problem' || type === 'abandon_risk') {
        await handleConversionIntervention(insight)
        await patchStatus(insight.id, 'actioned')
        results[insight.insight_id] = 'actioned:conversion_flagged'

      } else if (type === 'cmo_recommendation' && insight.status === 'actioned') {
        // Flash sale approved by owner — activate promotion
        await handlePromotion(insight, API_KEY, BASE_ID)
        await patchStatus(insight.id, 'actioned')
        results[insight.insight_id] = 'actioned:promotion_activated'

      } else if (type === 'reorder_opportunity') {
        await patchStatus(insight.id, 'pending_approval')
        pendingApproval.push(insight.insight_id)
        results[insight.insight_id] = 'pending_approval'

      } else if (type === 'stock_risk') {
        await handleStockAlert(insight)
        await patchStatus(insight.id, 'actioned')
        results[insight.insight_id] = 'actioned:stock_alert'

      } else if (type === 'hot_products') {
        if (insight.item_code) {
          await handleMerchandisingUpdate(insight)
          await patchStatus(insight.id, 'actioned')
          results[insight.insight_id] = 'actioned:merchandising'
        } else {
          await patchStatus(insight.id, 'actioned')
          results[insight.insight_id] = 'actioned:no_item_code'
        }

      } else {
        await patchStatus(insight.id, 'actioned')
        results[insight.insight_id] = 'actioned:pattern_logged'
      }
    } catch (e: unknown) {
      console.error(`[act] ${insight.insight_id}:`, e instanceof Error ? e.message : e)
      results[insight.insight_id] = `error`
    }
  }

  return NextResponse.json({ ok: true, actioned: Object.keys(results).length, pending_approval: pendingApproval, results })
}
