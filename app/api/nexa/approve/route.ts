import { NextRequest, NextResponse } from 'next/server'
import { handleReorderReminder, handleStockAlert, HayaInsight } from '@/lib/nexa-actions'

export const dynamic = 'force-dynamic'

const API_KEY  = process.env.AIRTABLE_API_KEY!
const BASE_ID  = process.env.AIRTABLE_BASE_ID!
const AT_BASE  = `https://api.airtable.com/v0/${BASE_ID}`
const MAKE_WH  = process.env.MAKE_DISPATCH_WEBHOOK_URL
const OWNER_PH = process.env.OWNER_WHATSAPP_NUMBER

async function fetchInsight(id: string): Promise<HayaInsight | null> {
  try {
    const res = await fetch(`${AT_BASE}/Nexa_Insights/${id}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      cache:   'no-store',
    })
    if (!res.ok) return null
    const r = await res.json()
    return {
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
    }
  } catch {
    return null
  }
}

async function patchStatus(id: string, status: string) {
  await fetch(`${AT_BASE}/Nexa_Insights/${id}`, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ fields: { status } }),
  }).catch(() => {})
}

export async function POST(req: NextRequest) {
  try {
    const { action, insight_ids } = await req.json() as {
      action:      string
      insight_ids: string[]
    }

    if (!insight_ids?.length) {
      return NextResponse.json({ error: 'insight_ids required' }, { status: 400 })
    }

    const ids = action === 'approve_1' ? insight_ids.slice(0, 1) : insight_ids
    let actioned = 0

    for (const id of ids) {
      const insight = await fetchInsight(id)
      if (!insight) continue
      try {
        const type = insight.insight_type || insight.package
        if (type === 'reorder_opportunity') await handleReorderReminder(insight)
        else if (type === 'stock_risk')     await handleStockAlert(insight)
        await patchStatus(id, 'actioned')
        actioned++
      } catch (e: unknown) {
        console.error(`[approve] ${id}:`, e instanceof Error ? e.message : e)
      }
    }

    const confirmMsg = `✅ Done. ${actioned} action${actioned !== 1 ? 's' : ''} executed by Haya.`
    if (MAKE_WH && OWNER_PH) {
      await fetch(MAKE_WH, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'haya_confirmation', phone: OWNER_PH, message: confirmMsg }),
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true, actioned, message: confirmMsg })
  } catch (error) {
    console.error('[POST /api/nexa/approve]', error)
    return NextResponse.json({ error: 'Approval processing failed' }, { status: 500 })
  }
}
