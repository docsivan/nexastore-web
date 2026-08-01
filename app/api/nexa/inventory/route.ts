import { NextRequest, NextResponse } from 'next/server'
import { atCreate, atPatch } from '@/lib/ai-tables'
import { getPaidOrdersSince, getAllProducts } from '@/lib/supabase'
import { runInventoryAgent, InventoryAlert } from '@/lib/nexa-agents'
import { getStoreContext } from '@/lib/ai-context'

export const dynamic = 'force-dynamic'


function checkAuth(req: NextRequest): boolean {
  const cronSecret = req.headers.get('x-cron-secret')
  return cronSecret === process.env.CRON_SECRET || req.cookies.get('adminAuth')?.value === 'true'
}

function nanoid(): string {
  return `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

type ProductRec = {
  id: string
  item_code?:      string
  name?:           string
  brand?:          string
  category?:       string
  stock_quantity?: number
  cost_price?:     number
  final_price?:    number
  haya_badge?:     string
}

type ItemLine = { item_code?: string; quantity?: number }

async function fetchProducts(): Promise<ProductRec[]> {
  try {
    return (await getAllProducts()) as unknown as ProductRec[]
  } catch { return [] }
}

async function fetchRecentOrderItems(): Promise<Record<string, number>> {
  const since   = new Date(Date.now() - 30 * 86400000).toISOString()
  const records = await getPaidOrdersSince(since, 500).catch(() => [])
  const unitsSold: Record<string, number> = {}
  for (const r of records as unknown as Array<{ items?: string }>) {
    try {
      const items: ItemLine[] = JSON.parse(r.items ?? '[]')
      for (const item of items) {
        const code = item.item_code ?? ''
        if (code) unitsSold[code] = (unitsSold[code] ?? 0) + (item.quantity ?? 1)
      }
    } catch {}
  }
  return unitsSold
}

async function writeInsight(alert: InventoryAlert) {
  await atCreate('Nexa_Insights', {
    insight_id:      nanoid(),
    insight_type:    'inventory_alert',
    insight_text:    alert.insight_text,
    action_required: alert.action_required,
    priority:        String(alert.priority ?? '2'),
    status:          'new',
    data_window:     'last_30_days',
  })
}

async function patchLowStockBadge(productId: string) {
  await atPatch('Products', productId, { haya_badge: 'LOW STOCK' })
}

async function sendWhatsAppAlert(message: string) {
  const webhookUrl = process.env.MAKE_DISPATCH_WEBHOOK_URL
  if (!webhookUrl) return
  await fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type:    'inventory_critical',
      message,
      phone:   process.env.OWNER_WHATSAPP_NUMBER,
    }),
  }).catch(() => {})
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [products, unitsSold] = await Promise.all([
      fetchProducts(),
      fetchRecentOrderItems(),
    ])

    type StockEntry = {
      id:              string
      item_code:       string
      name:            string
      brand:           string
      category:        string
      stock:           number
      cost:            number
      units_sold_30d:  number
      daily_velocity:  number
      days_to_stockout: number | null
      reorder_qty:     number
      urgency:         'CRITICAL' | 'URGENT' | 'WATCH' | 'OK'
    }

    const flagged: StockEntry[] = []
    const lowStockIds: string[] = []

    for (const p of products) {
      const code     = p.item_code ?? ''
      const stock    = p.stock_quantity ?? 0
      const sold     = unitsSold[code] ?? 0
      const velocity = sold / 30
      const daysOut  = velocity > 0 ? stock / velocity : null
      const reorder  = Math.ceil(velocity * 45)

      let urgency: StockEntry['urgency'] = 'OK'
      if (daysOut !== null) {
        if (daysOut < 7)       urgency = 'CRITICAL'
        else if (daysOut < 21) urgency = 'URGENT'
        else if (daysOut < 45) urgency = 'WATCH'
      } else if (stock < 10) {
        urgency = 'URGENT'
      }

      if (urgency !== 'OK') {
        flagged.push({
          id:              p.id,
          item_code:       code,
          name:            p.name  ?? code,
          brand:           p.brand ?? '',
          category:        p.category ?? '',
          stock,
          cost:            p.cost_price ?? 0,
          units_sold_30d:  sold,
          daily_velocity:  parseFloat(velocity.toFixed(4)),
          days_to_stockout: daysOut !== null ? Math.round(daysOut) : null,
          reorder_qty:     reorder,
          urgency,
        })

        if (stock < 10) lowStockIds.push(p.id)
      }
    }

    // Patch LOW STOCK badge on all flagged products
    await Promise.all(lowStockIds.map(id => patchLowStockBadge(id)))

    // Call inventory agent for AI analysis
    const alerts = await runInventoryAgent(flagged)

    // Write all alerts to Nexa_Insights
    await Promise.all(alerts.map(a => writeInsight(a)))

    // Send WhatsApp for CRITICAL items
    const criticalItems = flagged.filter(f => f.urgency === 'CRITICAL')
    if (criticalItems.length > 0) {
      const storeCtx = await getStoreContext()
      const lines = criticalItems.map(
        p => `⚠️ ${p.name} (${p.brand}): ${p.stock} units, ~${p.days_to_stockout ?? 0}d left`
      )
      const message = `🚨 *CRITICAL STOCK ALERT — ${storeCtx.storeName}*\n\n${lines.join('\n')}\n\nReorder immediately to avoid stockout.`
      await sendWhatsAppAlert(message)
    }

    return NextResponse.json({
      ok:             true,
      flagged_count:  flagged.length,
      critical_count: criticalItems.length,
      urgent_count:   flagged.filter(f => f.urgency === 'URGENT').length,
      badges_patched: lowStockIds.length,
      alerts_written: alerts.length,
    })
  } catch (err) {
    console.error('[Inventory] Error:', err)
    return NextResponse.json({ error: 'Inventory agent failed' }, { status: 500 })
  }
}
