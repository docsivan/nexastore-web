const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_URL  = `https://api.airtable.com/v0/${BASE_ID}/Haya_Memory`

function atAuth() {
  return { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
}

export interface HayaSignal {
  session_id:        string
  customer_id?:      string
  customer_segment?: string
  signal_type:       'search' | 'view' | 'add_to_cart' | 'order' | 'abandon' | 'chat'
  query?:            string
  item_code?:        string
  action:            string
  outcome?:          string
  page_url:          string
  cart_total?:       number
  chat_summary?:     string
}

export async function writeSignal(signal: HayaSignal): Promise<void> {
  if (!API_KEY || !BASE_ID) return
  try {
    await fetch(AT_URL, {
      method: 'POST',
      headers: atAuth(),
      body: JSON.stringify({
        fields: {
          session_id:        signal.session_id,
          customer_id:       signal.customer_id       ?? '',
          customer_segment:  signal.customer_segment  ?? '',
          signal_type:       signal.signal_type,
          query:             signal.query             ?? '',
          item_code:         signal.item_code         ?? '',
          action:            signal.action,
          outcome:           signal.outcome           ?? '',
          page_url:          signal.page_url,
          cart_total:        signal.cart_total        ?? 0,
          chat_summary:      signal.chat_summary      ?? '',
          created_at:        new Date().toISOString(),
        },
      }),
    })
  } catch (e) {
    console.error('[memory] writeSignal failed (non-fatal):', e)
  }
}

export async function getCustomerMemory(customer_id: string): Promise<HayaSignal[]> {
  if (!API_KEY || !BASE_ID) return []
  try {
    const formula = encodeURIComponent(`{customer_id}='${customer_id}'`)
    const url = `${AT_URL}?filterByFormula=${formula}&sort[0][field]=created_at&sort[0][direction]=desc&maxRecords=10`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return (data.records ?? []).map((r: { fields: HayaSignal }) => r.fields)
  } catch {
    return []
  }
}

export async function getSessionSearches(session_id: string): Promise<string[]> {
  if (!API_KEY || !BASE_ID) return []
  try {
    const formula = encodeURIComponent(
      `AND({session_id}='${session_id}',{signal_type}='search')`
    )
    const url = `${AT_URL}?filterByFormula=${formula}&sort[0][field]=created_at&sort[0][direction]=desc&maxRecords=5`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return (data.records ?? [])
      .map((r: { fields: { query?: string } }) => r.fields.query ?? '')
      .filter(Boolean)
  } catch {
    return []
  }
}
