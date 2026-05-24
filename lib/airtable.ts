/**
 * lib/airtable.ts
 * Reusable Airtable REST API client — no SDK dependency.
 * Uses AIRTABLE_API_KEY + AIRTABLE_BASE_ID from environment variables.
 */

import {
  AirtableProduct,
  AirtableOrder,
  AirtableCustomer,
  AirtableListResponse,
  ProductFields,
  OrderFields,
  CustomerFields,
  OrderItem,
} from './airtableTypes'

// ─── Config ───────────────────────────────────────────────────────────────────
const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

// Table names — must match exactly in Airtable
const TABLES = {
  PRODUCTS:    'Products',
  ORDERS:      'Orders',
  CUSTOMERS:   'Customers',
  DISCLAIMERS: 'Disclaimers',
} as const

// ─── Auth headers ─────────────────────────────────────────────────────────────
function authHeaders(): Record<string, string> {
  if (!API_KEY) throw new Error('AIRTABLE_API_KEY is not set')
  if (!BASE_ID) throw new Error('AIRTABLE_BASE_ID is not set')
  return {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }
}

// ─── Core: list records with auto-pagination ──────────────────────────────────
async function fetchAll<T>(
  table: string,
  formula?: string,
  maxRecords?: number
): Promise<import('./airtableTypes').AirtableRecord<T>[]> {
  const records: import('./airtableTypes').AirtableRecord<T>[] = []
  let offset: string | undefined

  do {
    const url = new URL(`${AT_BASE}/${encodeURIComponent(table)}`)
    url.searchParams.set('pageSize', '100')
    if (formula)    url.searchParams.set('filterByFormula', formula)
    if (maxRecords) url.searchParams.set('maxRecords', String(maxRecords))
    if (offset)     url.searchParams.set('offset', offset)

    const res = await fetch(url.toString(), {
      headers: authHeaders(),
      cache: 'no-store',
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Airtable [${table}] list error ${res.status}: ${body}`)
    }

    const data: AirtableListResponse<T> = await res.json()
    records.push(...(data.records ?? []))
    offset = data.offset
  } while (offset)

  return records
}

// ─── Core: fetch one record by formula ───────────────────────────────────────
async function fetchOne<T>(
  table: string,
  formula: string
): Promise<import('./airtableTypes').AirtableRecord<T> | null> {
  const url = new URL(`${AT_BASE}/${encodeURIComponent(table)}`)
  url.searchParams.set('filterByFormula', formula)
  url.searchParams.set('maxRecords', '1')

  const res = await fetch(url.toString(), {
    headers: authHeaders(),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Airtable [${table}] fetchOne error ${res.status}: ${body}`)
  }

  const data: AirtableListResponse<T> = await res.json()
  return data.records?.[0] ?? null
}

// ─── Core: create a single record ────────────────────────────────────────────
async function createRecord<T>(
  table: string,
  fields: Partial<T>
): Promise<import('./airtableTypes').AirtableRecord<T>> {
  const res = await fetch(`${AT_BASE}/${encodeURIComponent(table)}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ fields }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Airtable [${table}] create error ${res.status}: ${body}`)
  }

  return res.json()
}

// ─── Core: update a single record (PATCH — only supplied fields changed) ──────
async function updateRecord<T>(
  table: string,
  recordId: string,
  fields: Partial<T>
): Promise<import('./airtableTypes').AirtableRecord<T>> {
  const res = await fetch(`${AT_BASE}/${encodeURIComponent(table)}/${recordId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ fields }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Airtable [${table}] update error ${res.status}: ${body}`)
  }

  return res.json()
}

// ─── Helper: escape single quotes for Airtable formula strings ───────────────
function esc(value: string): string {
  return value.replace(/'/g, "\\'")
}

// ─── Helper: generate unique order ID ────────────────────────────────────────
function generateOrderId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).toUpperCase().slice(2, 7)
  return `HS-${date}-${rand}`
}

// ─── Helper: generate unique customer ID ─────────────────────────────────────
function generateCustomerId(): string {
  return `CUS-${Date.now().toString(36).toUpperCase()}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns all active products (is_active = true).
 */
export async function getProducts(): Promise<AirtableProduct[]> {
  return fetchAll<ProductFields>(
    TABLES.PRODUCTS,
    '{is_active}=1'
  )
}

/**
 * Returns a single product by item_code, or null if not found.
 */
export async function getProductByItemCode(
  item_code: string
): Promise<AirtableProduct | null> {
  return fetchOne<ProductFields>(
    TABLES.PRODUCTS,
    `{item_code}='${esc(item_code)}'`
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a new provisional order record and returns it.
 */
export async function createOrder(
  orderData: Omit<OrderFields, 'order_id' | 'created_at'>
): Promise<AirtableOrder> {
  const fields: Partial<OrderFields> = {
    ...orderData,
    
    
    payment_status:  orderData.payment_status  || 'pending',
    delivery_status: orderData.delivery_status || 'processing',
  }
  return createRecord<OrderFields>(TABLES.ORDERS, fields)
}

/**
 * Updates an existing order by Airtable record ID.
 * Pass only the fields you want to change.
 */
export async function updateOrder(
  recordId: string,
  updateData: Partial<OrderFields>
): Promise<AirtableOrder> {
  return updateRecord<OrderFields>(TABLES.ORDERS, recordId, updateData)
}

/**
 * Finds an order by its order_id field value (e.g. "HS-20250428-ABC12").
 */
export async function getOrderByOrderId(
  order_id: string
): Promise<AirtableOrder | null> {
  return fetchOne<OrderFields>(
    TABLES.ORDERS,
    Number.isFinite(Number(order_id)) ? `{order_id}=${Number(order_id)}` : `{order_id}='${esc(order_id)}'`
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Searches for a customer by phone OR email.
 * If found → returns the existing record (created: false).
 * If not found → creates a new record (created: true).
 */
export async function findOrCreateCustomer(customerData: {
  customer_name: string
  clinic_name?: string
  phone: string
  email: string
  address?: string
  city?: string
  preferred_channel?: string
  notes?: string
}): Promise<{ customer: AirtableCustomer; created: boolean }> {
  // Search by phone OR email
  const formula = `OR({phone}='${esc(customerData.phone)}',{email}='${esc(customerData.email)}')`
  const existing = await fetchOne<CustomerFields>(TABLES.CUSTOMERS, formula)

  if (existing) {
    return { customer: existing, created: false }
  }

  // Create new customer
  const fields: Partial<CustomerFields> = {
    customer_id:       generateCustomerId(),
    customer_name:     customerData.customer_name,
    clinic_name:       customerData.clinic_name   || '',
    phone:             customerData.phone,
    email:             customerData.email,
    address:           customerData.address        || '',
    city:              customerData.city           || '',
    total_orders:      0,
    total_spent:       0,
    
    notes:             customerData.notes          || '',
  }

  const created = await createRecord<CustomerFields>(TABLES.CUSTOMERS, fields)
  return { customer: created, created: true }
}

/**
 * Updates a customer record by Airtable record ID.
 * Used after successful payment to update totals and last order date.
 */
export async function updateCustomer(
  recordId: string,
  updateData: Partial<CustomerFields>
): Promise<AirtableCustomer> {
  return updateRecord<CustomerFields>(TABLES.CUSTOMERS, recordId, updateData)
}

/**
 * Called after a successful payment to:
 *   - increment total_orders
 *   - add to total_spent
 *   - set last_order_date to today
 */
export async function recordSuccessfulOrder(
  customerRecordId: string,
  currentTotalOrders: number,
  currentTotalSpent: number,
  orderTotal: number
): Promise<AirtableCustomer> {
  return updateCustomer(customerRecordId, {
    total_orders:    currentTotalOrders + 1,
    total_spent:     Math.round((currentTotalSpent + orderTotal) * 1000) / 1000,
    last_order_date: new Date().toISOString().slice(0, 10),
  })
}


// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER LOGIN + ADMIN QUERIES
// ═══════════════════════════════════════════════════════════════════════════

export async function getCustomerByPhone(phone: string): Promise<AirtableCustomer | null> {
  return fetchOne<CustomerFields>(TABLES.CUSTOMERS, `{phone}='${esc(phone)}'`)
}

export async function getOrdersByPhone(phone: string): Promise<AirtableOrder[]> {
  return fetchAll<OrderFields>(TABLES.ORDERS, `{phone}='${esc(phone)}'`)
}

export async function getAllOrders(maxRecords = 500): Promise<AirtableOrder[]> {
  return fetchAll<OrderFields>(TABLES.ORDERS, undefined, maxRecords)
}

export async function getLowStockProducts(threshold = 10): Promise<AirtableProduct[]> {
  return fetchAll<ProductFields>(
    TABLES.PRODUCTS,
    `AND({is_active}=1,{stock_quantity}<${threshold})`
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// DISCLAIMER LOGGING
// ═══════════════════════════════════════════════════════════════════════════

export interface DisclaimerFields {
  session_id:     string
  question:       string
  accepted_at:    string
  customer_phone: string
  customer_name:  string
  ip_address:     string
  user_agent:     string
}

export async function createDisclaimerLog(
  data: Partial<DisclaimerFields>
): Promise<void> {
  try {
    await createRecord<DisclaimerFields>(TABLES.DISCLAIMERS, {
      ...data,
      accepted_at: data.accepted_at || new Date().toISOString(),
    })
  } catch (e) {
    // Non-blocking — never fail the UI because of logging
    console.error('[disclaimer log]', e)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRICING TIERS
// ═══════════════════════════════════════════════════════════════════════════════

interface PricingTierFields {
  tier_name:        string
  min_quantity:     number
  discount_percent: number
  label:            string
  color_hex:        string
}

export async function getPricingTiers() {
  return fetchAll<PricingTierFields>('Pricing_Tiers')
}

// ─── Re-export types for convenience ─────────────────────────────────────────
export type { AirtableProduct, AirtableOrder, AirtableCustomer, OrderItem }
