const API_KEY  = process.env.AIRTABLE_API_KEY!
const BASE_ID  = process.env.AIRTABLE_BASE_ID!
const AT_BASE  = `https://api.airtable.com/v0/${BASE_ID}`
const MAKE_WH  = process.env.MAKE_DISPATCH_WEBHOOK_URL
const OWNER_PH = process.env.OWNER_WHATSAPP_NUMBER

export interface HayaInsight {
  id:              string
  insight_id:      string
  package:         string
  insight_type:    string
  insight:         string
  priority:        number
  status:          string
  action_required: string
  item_code?:      string
  customer_id?:    string
}

function atHeaders() {
  return { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
}

async function writeHayaLog(fields: Record<string, string>) {
  if (!API_KEY || !BASE_ID) return
  await fetch(`${AT_BASE}/Nexa_Log`, {
    method:  'POST',
    headers: atHeaders(),
    body:    JSON.stringify({ fields: { timestamp: new Date().toISOString(), ...fields } }),
  }).catch(() => {})
}

async function fetchCustomer(id: string): Promise<{ name: string; phone: string; clinic: string } | null> {
  try {
    const res = await fetch(`${AT_BASE}/Customers/${id}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      cache:   'no-store',
    })
    if (!res.ok) return null
    const d = await res.json()
    return {
      name:   String(d.fields?.customer_name ?? ''),
      phone:  String(d.fields?.phone         ?? ''),
      clinic: String(d.fields?.clinic_name   ?? ''),
    }
  } catch {
    return null
  }
}

async function fetchProduct(itemCode: string): Promise<{ name: string; stock: number; brand: string; recordId: string } | null> {
  const formula = encodeURIComponent(`{item_code}='${itemCode}'`)
  try {
    const res = await fetch(`${AT_BASE}/Products?filterByFormula=${formula}&maxRecords=1`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      cache:   'no-store',
    })
    if (!res.ok) return null
    const d   = await res.json()
    const rec = d.records?.[0]
    if (!rec) return null
    return {
      name:     String(rec.fields?.name           ?? ''),
      stock:    Number(rec.fields?.stock_quantity  ?? 0),
      brand:    String(rec.fields?.brand           ?? ''),
      recordId: String(rec.id),
    }
  } catch {
    return null
  }
}

async function getLastOrderDaysAgo(phone: string): Promise<number> {
  const formula = encodeURIComponent(`{phone}='${phone}'`)
  try {
    const res = await fetch(
      `${AT_BASE}/Orders?filterByFormula=${formula}&sort[0][field]=created_at&sort[0][direction]=desc&maxRecords=1`,
      { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
    )
    if (!res.ok) return 30
    const d    = await res.json()
    const date = d.records?.[0]?.fields?.created_at as string | undefined
    if (!date) return 30
    return Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 86400000))
  } catch {
    return 30
  }
}

async function isRateLimited(customerId: string, itemCode: string): Promise<boolean> {
  const since   = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const formula = encodeURIComponent(
    `AND({action}='reorder_reminder_sent',{target}='${customerId}',{field}='${itemCode}',IS_AFTER({timestamp},"${since}"))`
  )
  try {
    const res = await fetch(`${AT_BASE}/Nexa_Log?filterByFormula=${formula}&maxRecords=1`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      cache:   'no-store',
    })
    if (!res.ok) return false
    const d = await res.json()
    return (d.records ?? []).length > 0
  } catch {
    return false
  }
}

async function sendWhatsApp(phone: string, message: string, type: string) {
  if (!MAKE_WH || !phone) return
  await fetch(MAKE_WH, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ type, phone, message }),
  }).catch(() => {})
}

// ── Handler 1: Reorder Reminder ───────────────────────────────────────────────
export async function handleReorderReminder(insight: HayaInsight): Promise<void> {
  const customerId = insight.customer_id ?? ''
  const itemCode   = insight.item_code   ?? ''

  if (!customerId || !itemCode) {
    await writeHayaLog({ trigger_type: 'reorder_reminder', action: 'skipped', reason: 'missing customer_id or item_code', status: 'skipped' })
    return
  }

  if (await isRateLimited(customerId, itemCode)) {
    await writeHayaLog({ trigger_type: 'reorder_reminder', action: 'rate_limited', target: customerId, field: itemCode, status: 'rate_limited' })
    return
  }

  const [customer, product] = await Promise.all([fetchCustomer(customerId), fetchProduct(itemCode)])
  if (!customer?.phone || !product?.name) {
    await writeHayaLog({ trigger_type: 'reorder_reminder', action: 'reorder_reminder_failed', target: customerId, field: itemCode, reason: 'could not fetch customer or product', status: 'failed' })
    return
  }

  const lastName = customer.name.split(' ').pop() ?? 'Doctor'
  const days     = await getLastOrderDaysAgo(customer.phone)
  const message  = `Hello Dr ${lastName}, you may be running low on ${product.name}. Your last order was ${days} day${days !== 1 ? 's' : ''} ago. Reorder at nexastore.io`

  await sendWhatsApp(customer.phone, message, 'reorder_reminder')
  await writeHayaLog({
    trigger_type: 'reorder_reminder',
    action:       'reorder_reminder_sent',
    target:       customerId,
    field:        itemCode,
    value:        message.slice(0, 100),
    status:       'applied',
  })
}

// ── Handler 2: Merchandising Update ──────────────────────────────────────────
export async function handleMerchandisingUpdate(insight: HayaInsight): Promise<void> {
  const itemCode = insight.item_code ?? ''
  if (!itemCode) {
    await writeHayaLog({ trigger_type: 'merchandising', action: 'skipped', reason: 'no item_code', status: 'skipped' })
    return
  }

  const product = await fetchProduct(itemCode)
  if (!product?.recordId) return

  await fetch(`${AT_BASE}/Products/${product.recordId}`, {
    method:  'PATCH',
    headers: atHeaders(),
    body:    JSON.stringify({ fields: { display_order: 1, haya_badge: 'TRENDING' } }),
  }).catch(() => {})

  await writeHayaLog({
    trigger_type: 'merchandising',
    action:       'merchandising_update',
    target:       itemCode,
    field:        product.recordId,
    value:        'display_order=1 haya_badge=TRENDING',
    status:       'applied',
  })
}

// ── Handler 3: Stock Alert ────────────────────────────────────────────────────
export async function handleStockAlert(insight: HayaInsight): Promise<void> {
  const itemCode = insight.item_code ?? ''
  const product  = itemCode ? await fetchProduct(itemCode) : null
  const name     = product?.name  ?? `item ${itemCode}`
  const stock    = product?.stock ?? 0
  const brand    = product?.brand ?? 'supplier'
  const message  = `⚠️ Stock Alert: ${name} has ${stock} units remaining. Order from ${brand} immediately.`

  if (OWNER_PH) await sendWhatsApp(OWNER_PH, message, 'stock_alert')

  if (product?.recordId) {
    await fetch(`${AT_BASE}/Products/${product.recordId}`, {
      method:  'PATCH',
      headers: atHeaders(),
      body:    JSON.stringify({ fields: { haya_badge: 'LOW STOCK' } }),
    }).catch(() => {})
  }

  await writeHayaLog({
    trigger_type: 'stock_alert',
    action:       'stock_alert_sent',
    target:       itemCode,
    value:        message.slice(0, 100),
    status:       'applied',
  })
}

// ── Handler 4: Conversion Intervention ───────────────────────────────────────
export async function handleConversionIntervention(insight: HayaInsight): Promise<void> {
  await writeHayaLog({
    trigger_type: 'conversion_flag',
    action:       'conversion_flagged',
    target:       insight.item_code ?? insight.insight_id,
    value:        insight.insight.slice(0, 100),
    reason:       (insight.action_required ?? '').slice(0, 100),
    status:       'applied',
  })
}

// ── Handler 5: Search Gap ─────────────────────────────────────────────────────
export async function handleSearchGap(insight: HayaInsight): Promise<void> {
  const queryMatch = insight.insight.match(/searching for ['"]?([^'".,\n]+)/i)
    ?? insight.insight.match(/query[:\s]+['"]?([^'".,\n]+)/i)
  const query = queryMatch?.[1]?.trim().toLowerCase()
    ?? (insight.action_required ?? '').toLowerCase().slice(0, 50).trim()

  if (!query) {
    await writeHayaLog({ trigger_type: 'search_gap', action: 'skipped', reason: 'could not parse query', status: 'skipped' })
    return
  }

  const searchFormula = encodeURIComponent(
    `OR(SEARCH("${query}",LOWER({name}))>0,SEARCH("${query}",LOWER({category}))>0)`
  )
  let hasMatch = false
  try {
    const res = await fetch(`${AT_BASE}/Products?filterByFormula=${searchFormula}&maxRecords=1`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      cache:   'no-store',
    })
    if (res.ok) {
      const d  = await res.json()
      hasMatch = (d.records ?? []).length > 0
    }
  } catch {}

  const today     = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const insightId = `INSIGHT-${today}-GAP-${Date.now().toString(36).toUpperCase()}`

  await fetch(`${AT_BASE}/Nexa_Insights`, {
    method:  'POST',
    headers: atHeaders(),
    body:    JSON.stringify({
      fields: {
        insight_id:      insightId,
        package:         hasMatch ? 'search_gap'    : 'catalogue_gap',
        insight_type:    hasMatch ? 'search_gap'    : 'catalogue_gap',
        insight:         hasMatch
          ? `Product exists for query "${query}" but may not surface in search results.`
          : `Customers are searching for "${query}" but no matching product exists in the catalogue.`,
        action_required: hasMatch
          ? `Update search tags for products matching "${query}"`
          : `Consider stocking a product matching "${query}"`,
        priority:        hasMatch ? 3 : 4,
        status:          'new',
        created_at:      new Date().toISOString(),
      },
    }),
  }).catch(() => {})

  await writeHayaLog({
    trigger_type: 'search_gap',
    action:       hasMatch ? 'search_gap_found' : 'catalogue_gap_found',
    target:       query,
    value:        hasMatch ? 'product_exists' : 'missing_from_catalogue',
    status:       'applied',
  })
}
