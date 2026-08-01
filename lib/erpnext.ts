// ERPNext connection client for Zevio
// Instance: https://zevio.m.frappe.cloud

const ERPNEXT_URL = process.env.ERPNEXT_URL!
const ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY!
const ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET!

function getHeaders() {
  return {
    'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
}

// ── CORE REST ─────────────────────────────────────────────

export async function erpGet(doctype: string, filters?: string) {
  const url = `${ERPNEXT_URL}/api/resource/${encodeURIComponent(doctype)}${
    filters ? `?${filters}` : ''
  }`
  const res = await fetch(url, { headers: getHeaders() })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ERPNext GET failed [${res.status}]: ${err}`)
  }
  return res.json()
}

export async function erpGetDoc(doctype: string, name: string) {
  const url = `${ERPNEXT_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`
  const res = await fetch(url, { headers: getHeaders() })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ERPNext GET doc failed [${res.status}]: ${err}`)
  }
  return res.json()
}

export async function erpCreate(doctype: string, data: Record<string, unknown>) {
  const res = await fetch(
    `${ERPNEXT_URL}/api/resource/${encodeURIComponent(doctype)}`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ERPNext POST failed [${res.status}]: ${err}`)
  }
  return res.json()
}

export async function erpUpdate(
  doctype: string,
  name: string,
  data: Record<string, unknown>
) {
  const res = await fetch(
    `${ERPNEXT_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ERPNext PUT failed [${res.status}]: ${err}`)
  }
  return res.json()
}

// ── BUSINESS OPERATIONS ───────────────────────────────────

export async function createSalesOrder(order: {
  customer: string
  order_id: string
  items: Array<{ item_code: string; qty: number; rate: number }>
  total: number
}) {
  return erpCreate('Sales Order', {
    doctype: 'Sales Order',
    customer: order.customer,
    transaction_date: new Date().toISOString().split('T')[0],
    delivery_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    po_no: order.order_id,
    items: order.items.map((i) => ({
      item_code: i.item_code,
      qty: i.qty,
      rate: i.rate,
    })),
  })
}

export async function createCustomer(data: {
  customer_name: string
  phone?: string
  email?: string
}) {
  return erpCreate('Customer', {
    doctype: 'Customer',
    customer_name: data.customer_name,
    customer_type: 'Individual',
    // Group-type values are rejected by ERPNext; these are leaf nodes.
    customer_group: process.env.ERPNEXT_CUSTOMER_GROUP || 'Commercial',
    territory: process.env.ERPNEXT_TERRITORY || 'Oman',
    mobile_no: data.phone,
    email_id: data.email,
  })
}

export async function getStockBalance(item_code: string) {
  return erpGet(
    'Bin',
    `filters=[["item_code","=","${item_code}"]]&fields=["item_code","warehouse","actual_qty"]`
  )
}

export async function testConnection(): Promise<boolean> {
  try {
    await erpGet('DocType', 'limit=1')
    return true
  } catch {
    return false
  }
}
