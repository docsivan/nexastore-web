import { NextRequest, NextResponse } from 'next/server'
import { atGetPath, atCreate, atPatch } from '@/lib/ai-tables'
import { callSonnet } from '@/lib/claude'
import { getStoreContext } from '@/lib/ai-context'

export const dynamic = 'force-dynamic'


/** Thin alias so the atFetch(...) call sites below stay unchanged. */
async function atFetch(path: string) {
  return atGetPath(path)
}

async function fetchNewInsights(): Promise<{ id: string; insight: string; package: string; priority: number }[]> {
  try {
    const formula = encodeURIComponent(`{status}='new'`)
    const data = await atGetPath(`/Nexa_Insights?filterByFormula=${formula}&sort[0][field]=priority&sort[0][direction]=desc&maxRecords=3`)
    return (data.records ?? []).map((r: Record<string, unknown> & { id: string }) => ({
      id:       r.id,
      insight:  r.insight as string ?? '',
      package:  r.package as string ?? '',
      priority: r.priority as number ?? 0,
    }))
  } catch {
    return []
  }
}

async function fetchCfoInsights(): Promise<{ id: string; insight_text: string }[]> {
  try {
    const formula = encodeURIComponent(`AND({insight_type}="cfo_analysis",{status}="new")`)
    const data = await atGetPath(`/Nexa_Insights?filterByFormula=${formula}&sort[0][field]=priority&sort[0][direction]=asc&maxRecords=2`)
    return (data.records ?? []).map((r: Record<string, unknown> & { id: string }) => ({
      id:           r.id,
      insight_text: String(r.insight_text ?? ''),
    }))
  } catch {
    return []
  }
}

async function acknowledgeInsights(ids: string[]) {
  for (const id of ids) {
    await atPatch('Nexa_Insights', id, { status: 'acknowledged' })
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const isAdmin    = req.headers.get('x-admin-pin') === process.env.ADMIN_PIN

  if (!isAdmin && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now       = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const ydStart       = yesterday.toISOString().split('T')[0] + 'T00:00:00.000Z'
  const ydEnd         = yesterday.toISOString().split('T')[0] + 'T23:59:59.999Z'
  const fortyEightAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()

  const [ordersData, pendingDispatchData, overdueData, stockData, insights, cfoInsights] = await Promise.all([
    atFetch(`/Orders?filterByFormula=${encodeURIComponent(
      `AND(IS_AFTER({created_at},"${ydStart}"),IS_BEFORE({created_at},"${ydEnd}"))`
    )}`),
    atFetch(`/Orders?filterByFormula=${encodeURIComponent(`{delivery_status}='processing'`)}`),
    atFetch(`/Orders?filterByFormula=${encodeURIComponent(
      `AND({payment_status}='pending',IS_BEFORE({created_at},"${fortyEightAgo}"))`
    )}`),
    atFetch(`/Products?maxRecords=20&filterByFormula=${encodeURIComponent(
      `AND({is_active}=1,{stock_quantity}<10)`
    )}`),
    fetchNewInsights(),
    fetchCfoInsights(),
  ])

  type OrderRec = { total?: number; payment_status?: string; delivery_status?: string; items?: string; order_id?: string; customer_name?: string; created_at?: string }
  type StockRec = { name?: string; item_code?: string; stock_quantity?: number }

  const orders:          OrderRec[] = ordersData.records           ?? []
  const pendingDispatch: OrderRec[] = pendingDispatchData.records  ?? []
  const overdueOrders:   OrderRec[] = overdueData.records          ?? []
  const lowStock:        StockRec[] = stockData.records            ?? []

  const yesterdayRevenue    = orders.reduce((s, o) => s + (o.total ?? 0), 0)
  const pendingPaymentsYest = orders.filter(o => o.payment_status === 'pending').length
  const outOfStock          = lowStock.filter(p => (p.stock_quantity ?? 0) === 0)
  const criticalLow         = lowStock.filter(p => (p.stock_quantity ?? 0) > 0)

  const revenueByProduct: Record<string, { name: string; revenue: number }> = {}
  for (const order of orders) {
    try {
      const items: { item_code?: string; name?: string; final_price?: number; quantity?: number }[] =
        JSON.parse(order.items ?? '[]')
      for (const item of items) {
        const key = item.item_code ?? item.name ?? 'unknown'
        if (!revenueByProduct[key]) revenueByProduct[key] = { name: item.name ?? key, revenue: 0 }
        revenueByProduct[key].revenue += (item.final_price ?? 0) * (item.quantity ?? 1)
      }
    } catch {}
  }
  const top5Products = Object.values(revenueByProduct)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(p => `${p.name}: \${p.revenue.toFixed(2)}`)

  const urgentContext = {
    low_stock:        criticalLow.map(p => `${p.name} (${p.item_code}): ${p.stock_quantity} units left`),
    out_of_stock:     outOfStock.map(p => `${p.name} (${p.item_code})`),
    overdue_orders:   overdueOrders.map(o => `${o.order_id} — ${o.customer_name}: \${(o.total ?? 0).toFixed(2)}`),
    pending_dispatch: pendingDispatch.length,
  }

  const storeCtx  = await getStoreContext()
  let urgentAction = ''
  try {
    urgentAction = await callSonnet(
      `What is the ONE most important action the store owner must take today? Max 2 sentences. Be specific with product name and quantity.\n\nData: ${JSON.stringify(urgentContext)}`,
      `You are the AI business intelligence engine for ${storeCtx.storeName}. Be concise, specific, and decisive.`
    )
  } catch {
    if (outOfStock.length > 0) {
      urgentAction = `Restock ${outOfStock[0].name} immediately — it is completely out of stock and blocking sales.`
    } else if (criticalLow.length > 0) {
      urgentAction = `Reorder ${criticalLow[0].name} now — only ${criticalLow[0].stock_quantity} units left.`
    } else if (overdueOrders.length > 0) {
      urgentAction = `Follow up on ${overdueOrders.length} overdue unpaid order${overdueOrders.length > 1 ? 's' : ''} — chase customers to complete payment.`
    } else {
      urgentAction = `Dispatch the ${pendingDispatch.length} processing orders to keep delivery times on target.`
    }
  }

  const insightsBlock = insights.length > 0
    ? insights.map(i => `• [${i.package}] ${i.insight}`).join('\n')
    : ''

  const contextSummary = {
    date:              yesterday.toISOString().split('T')[0],
    yesterday_orders:  orders.length,
    yesterday_revenue: `\${yesterdayRevenue.toFixed(2)}`,
    pending_payments:  pendingPaymentsYest,
    pending_dispatch:  pendingDispatch.length,
    overdue_orders:    overdueOrders.length,
    out_of_stock:      outOfStock.map(p => `${p.name} (${p.item_code})`),
    low_stock:         criticalLow.map(p => `${p.name}: ${p.stock_quantity} left`),
    top_products:      top5Products,
    action_required:   urgentAction,
    haya_insights:     insightsBlock || 'None today',
  }

  let message = ''
  try {
    message = await callSonnet(
      `Write a concise WhatsApp morning briefing for the store owner. Professional, direct, no fluff. Use emojis for section headers only. End with this exact action sentence: "${urgentAction}" Maximum 500 characters.\n\nData: ${JSON.stringify(contextSummary)}`,
      `You are the AI Business Engine for ${storeCtx.storeName}. Write concise, professional WhatsApp briefings.`
    )
  } catch {
    message = `Good morning! 📊 Yesterday: ${orders.length} orders, \${yesterdayRevenue.toFixed(2)} revenue. 🚚 ${pendingDispatch.length} pending dispatch. ⏰ ${overdueOrders.length} overdue. ⚠️ ${outOfStock.length} out of stock.\n\n👉 ${urgentAction}`
  }

  // Append CFO intelligence block if insights exist
  if (cfoInsights.length > 0) {
    const cfoBlock = cfoInsights.map(i => `• ${i.insight_text}`).join('\n')
    message += `\n\n💼 *CFO Intelligence:*\n${cfoBlock}`
  }

  const webhookUrl = process.env.MAKE_DISPATCH_WEBHOOK_URL
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:    'owner_briefing',
        message,
        phone:   process.env.OWNER_WHATSAPP_NUMBER,
      }),
    }).catch(() => {})
  }

  if (insights.length > 0) {
    await acknowledgeInsights(insights.map(i => i.id))
  }
  if (cfoInsights.length > 0) {
    await acknowledgeInsights(cfoInsights.map(i => i.id))
  }

  await atCreate('Nexa_Log', {
        timestamp:    now.toISOString(),
        trigger_type: 'morning_briefing',
        action:       'send_briefing',
        target:       'owner',
        field:        'whatsapp',
        value:        message.slice(0, 100),
        reason:       urgentAction.slice(0, 100),
        status:       'applied',
      }).catch(() => {})

  return NextResponse.json({ ok: true, message, context: contextSummary })
}
