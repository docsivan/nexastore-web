import { guardCronRoute } from '@/lib/admin-guard'
import { NextRequest, NextResponse } from 'next/server'
import { atList, atCreate, atPatch } from '@/lib/ai-tables'
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

async function handlePromotion(insight: HayaInsight) {
  const itemCode = insight.item_code
  if (!itemCode) return

  // Extract discount % from action_required or insight text
  const text = (insight.action_required ?? '') + ' ' + (insight.insight ?? '')
  const discountMatch = text.match(/(\d{1,3})\s*%/)
  const promoDiscount = discountMatch ? parseInt(discountMatch[1]) : 10

  // Fetch current product
  const prodData   = await atList('Products', { limit: 1, match: { item_code: itemCode } })
  const prodRecord = prodData.records?.[0]
  if (!prodRecord) return

  const originalDiscount = Number(prodRecord.discount_percent ?? 0)
  const now     = new Date()
  const endsAt  = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  // New discount + SALE badge
  await atPatch('Products', prodRecord.id, {
    discount_percent: promoDiscount,
    haya_badge: 'SALE',
  })

  await atCreate('Haya_Promotions', {
    promo_id:          promoId(),
    item_code:         itemCode,
    original_discount: originalDiscount,
    promo_discount:    promoDiscount,
    starts_at:         now.toISOString().split('T')[0],
    ends_at:           endsAt.toISOString().split('T')[0],
    status:            'active',
    approved_by:       'owner',
  })
}

async function expirePromotions() {
  const todayStr = new Date().toISOString().split('T')[0]
  const data = await atList('Haya_Promotions', { limit: 50, match: { status: 'active' } })
  const due = (data.records ?? []).filter(
    (r: { ends_at?: string }) => String(r.ends_at ?? '') < todayStr
  )

  for (const rec of due as Array<{ item_code?: string; original_discount?: number } & { id: string }>) {
    const itemCode = rec.item_code
    if (itemCode) {
      // Restore original discount and clear badge
      const prodData   = await atList('Products', { limit: 1, match: { item_code: itemCode } })
      const prodRecord = prodData.records?.[0]
      if (prodRecord) {
        await atPatch('Products', prodRecord.id, {
          discount_percent: rec.original_discount ?? 0,
          haya_badge:       '',
        })
      }
    }
    await atPatch('Haya_Promotions', rec.id, { status: 'expired' })
  }
}

export const dynamic = 'force-dynamic'

async function fetchHighPriorityInsights(): Promise<HayaInsight[]> {
  try {
    // priority is text, so the >= 4 threshold is applied in JS
    const data = await atList('Nexa_Insights', {
      limit: 20, orderBy: 'priority', match: { status: 'new' },
    })
    return (data.records ?? []).map((r: Record<string, unknown> & { id: string }) => ({
      id:              r.id,
      insight_id:      String(r.insight_id      ?? ''),
      package:         String(r.package         ?? ''),
      insight_type:    String(r.insight_type    ?? r.package ?? ''),
      insight:         String(r.insight_text    ?? r.insight ?? ''),
      priority:        Number(r.priority        ?? 0),
      status:          String(r.status          ?? ''),
      action_required: String(r.action_required ?? ''),
      item_code:       r.item_code   ? String(r.item_code)   : undefined,
      customer_id:     r.customer_id ? String(r.customer_id) : undefined,
    })).filter((i) => i.priority >= 4)
  } catch {
    return []
  }
}

async function patchStatus(id: string, status: string) {
  await atPatch('Nexa_Insights', id, { status })
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

  // Run expiry check on every act cycle
  await expirePromotions().catch(() => {})

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
        await handlePromotion(insight)
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
