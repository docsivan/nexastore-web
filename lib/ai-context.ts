// lib/ai-context.ts — Dynamic AI context engine (white-label)
// Module-level cache — 5-minute TTL to pick up product changes quickly.
const _ctx: { data: StoreContext | null; fetchedAt: number | null } = {
  data: null,
  fetchedAt: null,
}
const CACHE_TTL = 5 * 60 * 1000

export interface StoreContext {
  storeName:  string
  aiName:     string
  currency:   string
  products:   string
  categories: string
  promotions: string
}

export async function getStoreContext(): Promise<StoreContext> {
  if (_ctx.data && _ctx.fetchedAt && Date.now() - _ctx.fetchedAt < CACHE_TTL) {
    return _ctx.data
  }

  const storeName = process.env.NEXT_PUBLIC_PLATFORM_NAME ?? 'NexaStore'
  const aiName    = process.env.NEXT_PUBLIC_AI_NAME       ?? 'Nexa'
  const currency  = process.env.NEXT_PUBLIC_CURRENCY      ?? 'USD'

  const API_KEY = process.env.AIRTABLE_API_KEY
  const BASE_ID = process.env.AIRTABLE_BASE_ID

  let products   = 'Catalog loading — contact store for product info'
  let categories = 'All categories'
  let promotions = 'None currently'

  if (API_KEY && BASE_ID) {
    try {
      const AT      = `https://api.airtable.com/v0/${BASE_ID}`
      const headers = { Authorization: `Bearer ${API_KEY}` }

      const prodRes = await fetch(
        `${AT}/Products` +
        `?filterByFormula=${encodeURIComponent('{is_active}=1')}` +
        `&sort[0][field]=Created&sort[0][direction]=desc` +
        `&maxRecords=20` +
        `&fields[]=name&fields[]=category&fields[]=final_price` +
        `&fields[]=description&fields[]=item_code&fields[]=pack_size&fields[]=is_featured`,
        { headers, cache: 'no-store' }
      )

      if (prodRes.ok) {
        const prodData = await prodRes.json()
        const records  = prodData.records ?? []

        const catSet:    Set<string> = new Set()
        const prodLines: string[]    = []
        const promoLines: string[]   = []

        for (const r of records as Array<{ id: string; fields: Record<string, unknown> }>) {
          const f    = r.fields
          const name = String(f.name  ?? '')
          const cat  = String(f.category ?? '')
          const price = f.final_price ? Number(f.final_price).toFixed(2) : 'N/A'
          const sku   = String(f.item_code ?? r.id)
          const pack  = f.pack_size ? ` | ${String(f.pack_size)}` : ''
          const desc  = f.description ? ` — ${String(f.description).slice(0, 80)}` : ''

          if (cat) catSet.add(cat)
          prodLines.push(`${name} (SKU:${sku})${pack} | ${cat} | ${currency} ${price}${desc}`)
          if (f.is_featured) promoLines.push(name)
        }

        if (prodLines.length)  products   = prodLines.join('\n')
        if (catSet.size)       categories = Array.from(catSet).join(', ')
        if (promoLines.length) promotions = promoLines.join(', ')
      }
    } catch (err) {
      console.error('[ai-context] Airtable fetch failed:', err)
    }
  }

  const data: StoreContext = { storeName, aiName, currency, products, categories, promotions }
  _ctx.data      = data
  _ctx.fetchedAt = Date.now()
  return data
}

export function buildSystemPrompt(storeContext: StoreContext, customerOrders: string): string {
  return `You are ${storeContext.aiName}, the intelligent shopping assistant for ${storeContext.storeName}. You help customers find exactly what they need.

STORE: ${storeContext.storeName} | CURRENCY: ${storeContext.currency} | PROMOTIONS: ${storeContext.promotions}

CATALOG (top 20):
${storeContext.products}

CATEGORIES: ${storeContext.categories}

CUSTOMER HISTORY: ${customerOrders}

Your role: recommend products based on needs, suggest quantities, answer product questions accurately, help build complete orders. Be conversational, helpful and concise. Adapt entirely to the catalog above — never reference locations, regions, or anything outside the catalog.`
}

export async function getCustomerOrders(customerPhone: string): Promise<string> {
  const API_KEY = process.env.AIRTABLE_API_KEY
  const BASE_ID = process.env.AIRTABLE_BASE_ID
  if (!API_KEY || !BASE_ID || !customerPhone) return 'No previous orders'

  try {
    const formula = encodeURIComponent(`{phone}="${customerPhone}"`)
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/Orders` +
      `?filterByFormula=${formula}` +
      `&sort[0][field]=created_at&sort[0][direction]=desc` +
      `&maxRecords=5` +
      `&fields[]=order_id&fields[]=created_at&fields[]=items&fields[]=total`,
      { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
    )
    if (!res.ok) return 'No previous orders'
    const data    = await res.json()
    const records = data.records ?? []
    if (!records.length) return 'No previous orders'

    return (records as Array<{ fields: Record<string, unknown> }>)
      .map(r => {
        const f    = r.fields
        const date = f.created_at
          ? new Date(String(f.created_at)).toLocaleDateString('en-US')
          : 'Unknown date'
        const total = f.total ? Number(f.total).toFixed(2) : 'N/A'
        let items   = ''
        try {
          const parsed: Array<{ name?: string; quantity?: number }> =
            typeof f.items === 'string'
              ? JSON.parse(f.items)
              : (f.items as Array<{ name?: string; quantity?: number }> ?? [])
          items = parsed.slice(0, 3).map(i => `${i.name ?? 'item'} ×${i.quantity ?? 1}`).join(', ')
        } catch {}
        return `Order ${String(f.order_id ?? 'N/A')} (${date}): ${items || 'items'} — Total: ${total}`
      })
      .join('\n')
  } catch {
    return 'No previous orders'
  }
}
