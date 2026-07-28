/**
 * lib/supabase.ts
 * Zevio data layer — Supabase replacement for lib/airtable.ts.
 *
 * ─── IMPORTANT: TWO RETURN CONVENTIONS LIVE IN THIS FILE ───────────────────
 *
 * 1. LEGACY-COMPATIBLE LAYER (products / orders / customers / pricing_tiers)
 *    Returns Airtable-shaped records: `{ id, fields: {...}, createdTime }`.
 *    This exists so the ~332 existing `.fields.x` call sites across the app
 *    keep working unchanged after the Airtable → Supabase cutover.
 *    `id` is the Supabase row UUID (it replaces the old `rec…` Airtable ID),
 *    so `updateOrder(order.id, …)` and `updateCustomer(customer.id, …)`
 *    still work — they filter on the `id` column.
 *
 * 2. ZEVIO-NATIVE LAYER (ai_* tables)
 *    Returns plain flat rows. These tables have no legacy consumers, so there
 *    is nothing to stay compatible with.
 *
 * Field-name differences handled by the mappers below:
 *   name_ar/description_ar/category_ar  ->  nameAr/descriptionAr/categoryAr
 *   orders.items (jsonb)                ->  JSON string (callers JSON.parse it)
 *   created_at                          ->  createdTime on the record wrapper
 *
 * Not present in the Supabase schema (surface as undefined, both are optional
 * and already have fallbacks at every call site):
 *   products.list_price, products.breadcrumb
 */

import { createClient } from '@supabase/supabase-js'
import type {
  AirtableRecord,
  AirtableProduct,
  AirtableOrder,
  AirtableCustomer,
  ProductFields,
  OrderFields,
  CustomerFields,
  OrderItem,
} from './airtableTypes'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server-side client — full access, never expose to browser
export const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Client-side client — anon key, safe for browser
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

// ── SHAPE MAPPERS ─────────────────────────────────────────

/** Wraps a flat Supabase row into the Airtable `{ id, fields }` shape. */
function toRecord<T>(row: Record<string, any>, fields: T): AirtableRecord<T> {
  return {
    id: String(row.id),
    fields,
    createdTime: row.created_at ?? undefined,
  }
}

function productToRecord(row: Record<string, any>): AirtableProduct {
  const {
    id,
    created_at,
    updated_at,
    name_ar,
    description_ar,
    category_ar,
    ...rest
  } = row
  return toRecord(row, {
    ...rest,
    nameAr: name_ar ?? undefined,
    descriptionAr: description_ar ?? undefined,
    categoryAr: category_ar ?? undefined,
  } as unknown as ProductFields)
}

function orderToRecord(row: Record<string, any>): AirtableOrder {
  const { id, created_at, items, ...rest } = row
  return toRecord(row, {
    ...rest,
    created_at: created_at ?? '',
    // Callers JSON.parse this — Supabase stores it as jsonb.
    items: typeof items === 'string' ? items : JSON.stringify(items ?? []),
  } as unknown as OrderFields)
}

function customerToRecord(row: Record<string, any>): AirtableCustomer {
  const { id, created_at, password_hash, addresses, ...rest } = row
  return toRecord(row, rest as unknown as CustomerFields)
}

/** Reverse mapper: `fields`-style keys -> Supabase column names. */
function productFieldsToColumns(
  fields: Record<string, unknown>
): Record<string, unknown> {
  const { nameAr, descriptionAr, categoryAr, list_price, breadcrumb, ...rest } =
    fields
  const out: Record<string, unknown> = { ...rest }
  if (nameAr !== undefined) out.name_ar = nameAr
  if (descriptionAr !== undefined) out.description_ar = descriptionAr
  if (categoryAr !== undefined) out.category_ar = categoryAr
  return out
}

function orderFieldsToColumns(
  fields: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...fields }
  // Callers pass items as a JSON string; the column is jsonb.
  if (typeof out.items === 'string') {
    try {
      out.items = JSON.parse(out.items as string)
    } catch {
      out.items = []
    }
  }
  return out
}

// ── ID GENERATORS ─────────────────────────────────────────
// Airtable auto-generated these. Supabase requires them (NOT NULL UNIQUE).

function generateOrderId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).toUpperCase().slice(2, 7)
  return `ZV-${date}-${rand}`
}

function generateCustomerId(): string {
  return `CUS-${Date.now().toString(36).toUpperCase()}`
}

// ══════════════════════════════════════════════════════════
// LEGACY-COMPATIBLE LAYER — returns { id, fields }
// ══════════════════════════════════════════════════════════

// ── PRODUCTS ──────────────────────────────────────────────

/** Returns all active products. */
export async function getProducts(): Promise<AirtableProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: false })
  if (error) throw error
  return (data ?? []).map(productToRecord)
}

/** Returns a single product by item_code, or null if not found. */
export async function getProductByItemCode(
  item_code: string
): Promise<AirtableProduct | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('item_code', item_code)
    .maybeSingle()
  if (error) throw error
  return data ? productToRecord(data) : null
}

export async function getProductsByCategory(
  category: string
): Promise<AirtableProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('display_order', { ascending: false })
  if (error) throw error
  return (data ?? []).map(productToRecord)
}

export async function getAllProducts(): Promise<AirtableProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('display_order', { ascending: false })
  if (error) throw error
  return (data ?? []).map(productToRecord)
}

export async function getLowStockProducts(
  threshold = 10
): Promise<AirtableProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .lt('stock_quantity', threshold)
  if (error) throw error
  return (data ?? []).map(productToRecord)
}

// ── Homepage rail queries ─────────────────────────────────
// Replace the Airtable filterByFormula equivalents used by app/api/homepage/*.

/** Active products with a discount, biggest discount first. */
export async function getDiscountedProducts(limit = 8): Promise<AirtableProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .gt('discount_percent', 0)
    .order('discount_percent', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(productToRecord)
}

/** Active products running low but not out of stock, scarcest first. */
export async function getFastMovingProducts(
  threshold = 10,
  limit = 8
): Promise<AirtableProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .gt('stock_quantity', 0)
    .lt('stock_quantity', threshold)
    .order('stock_quantity', { ascending: true })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(productToRecord)
}

/** Active products created in the last `days`, newest first. */
export async function getNewArrivals(days = 30, limit = 8): Promise<AirtableProduct[]> {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(productToRecord)
}

/** Active products for a set of item codes (order not guaranteed). */
export async function getProductsByItemCodes(
  item_codes: string[],
  limit = 8
): Promise<AirtableProduct[]> {
  if (!item_codes.length) return []
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .in('item_code', item_codes)
    .eq('is_active', true)
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(productToRecord)
}

/** Active products across a set of categories — backs the personalised rail. */
export async function getProductsByCategories(
  categories: string[],
  limit = 8
): Promise<AirtableProduct[]> {
  if (!categories.length) return []
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .in('category', categories)
    .eq('is_active', true)
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(productToRecord)
}

/** Orders created since a cutoff — backs the top-sellers rail. */
export async function getOrdersSince(
  sinceISO: string,
  limit = 500
): Promise<AirtableOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(orderToRecord)
}

export async function updateProduct(
  item_code: string,
  updates: Record<string, unknown>
) {
  const { error } = await supabase
    .from('products')
    .update({
      ...productFieldsToColumns(updates),
      updated_at: new Date().toISOString(),
    })
    .eq('item_code', item_code)
  if (error) throw error
}

// ── ORDERS ────────────────────────────────────────────────

/** Creates a new provisional order and returns it. */
export async function createOrder(
  orderData: Partial<OrderFields>
): Promise<AirtableOrder> {
  const payload = orderFieldsToColumns({
    ...orderData,
    order_id: orderData.order_id || generateOrderId(),
    payment_status: orderData.payment_status || 'pending',
    delivery_status: orderData.delivery_status || 'processing',
  })
  const { data, error } = await supabase
    .from('orders')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return orderToRecord(data)
}

/**
 * Updates an existing order by row ID (the `id` returned on the record).
 * Replaces the old Airtable-record-ID behaviour.
 */
export async function updateOrder(
  recordId: string,
  updateData: Partial<OrderFields>
): Promise<AirtableOrder> {
  const { data, error } = await supabase
    .from('orders')
    .update(orderFieldsToColumns(updateData))
    .eq('id', recordId)
    .select()
    .single()
  if (error) throw error
  return orderToRecord(data)
}

/** Finds an order by its order_id field value. */
export async function getOrderByOrderId(
  order_id: string
): Promise<AirtableOrder | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_id', order_id)
    .maybeSingle()
  if (error) throw error
  return data ? orderToRecord(data) : null
}

export async function getOrdersByPhone(phone: string): Promise<AirtableOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(orderToRecord)
}

export async function getAllOrders(maxRecords = 500): Promise<AirtableOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(maxRecords)
  if (error) throw error
  return (data ?? []).map(orderToRecord)
}

// ── CUSTOMERS ─────────────────────────────────────────────

/**
 * Searches for a customer by phone OR email.
 * Found → returns existing (created: false). Not found → creates (created: true).
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
  const { data: existing, error: findError } = await supabase
    .from('customers')
    .select('*')
    .or(`phone.eq.${customerData.phone},email.eq.${customerData.email}`)
    .limit(1)
    .maybeSingle()
  if (findError) throw findError

  if (existing) {
    return { customer: customerToRecord(existing), created: false }
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({
      customer_id: generateCustomerId(),
      customer_name: customerData.customer_name,
      clinic_name: customerData.clinic_name || '',
      phone: customerData.phone,
      email: customerData.email,
      address: customerData.address || '',
      city: customerData.city || '',
      preferred_channel: customerData.preferred_channel || '',
      total_orders: 0,
      total_spent: 0,
      notes: customerData.notes || '',
    })
    .select()
    .single()
  if (error) throw error
  return { customer: customerToRecord(data), created: true }
}

/** Updates a customer by row ID (the `id` returned on the record). */
export async function updateCustomer(
  recordId: string,
  updateData: Partial<CustomerFields>
): Promise<AirtableCustomer> {
  const { data, error } = await supabase
    .from('customers')
    .update(updateData)
    .eq('id', recordId)
    .select()
    .single()
  if (error) throw error
  return customerToRecord(data)
}

/**
 * Called after a successful payment to increment totals and set last_order_date.
 */
export async function recordSuccessfulOrder(
  customerRecordId: string,
  currentTotalOrders: number,
  currentTotalSpent: number,
  orderTotal: number
): Promise<AirtableCustomer> {
  return updateCustomer(customerRecordId, {
    total_orders: currentTotalOrders + 1,
    total_spent: Math.round((currentTotalSpent + orderTotal) * 1000) / 1000,
    last_order_date: new Date().toISOString().slice(0, 10),
  })
}

export async function getCustomerByPhone(
  phone: string
): Promise<AirtableCustomer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', phone.replace(/\s/g, ''))
    .maybeSingle()
  if (error) throw error
  return data ? customerToRecord(data) : null
}

export async function getCustomerById(
  customer_id: string
): Promise<AirtableCustomer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('customer_id', customer_id)
    .maybeSingle()
  if (error) throw error
  return data ? customerToRecord(data) : null
}

export async function getAllCustomers(): Promise<AirtableCustomer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(customerToRecord)
}

// ── PRICING TIERS ─────────────────────────────────────────

export async function getPricingTiers() {
  const { data, error } = await supabase
    .from('pricing_tiers')
    .select('*')
    .order('min_quantity', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => {
    const { id, created_at, ...rest } = row
    return toRecord(row, rest)
  })
}

// ── DISCLAIMER LOGGING ────────────────────────────────────
// The Zevio schema has no `disclaimers` table — these are routed into ai_log.

export interface DisclaimerFields {
  session_id: string
  question: string
  accepted_at: string
  customer_phone: string
  customer_name: string
  ip_address: string
  user_agent: string
}

export async function createDisclaimerLog(
  data: Partial<DisclaimerFields>
): Promise<void> {
  try {
    const { error } = await supabase.from('ai_log').insert({
      signal_type: 'disclaimer',
      session_id: data.session_id,
      query: data.question,
      action: 'disclaimer_accepted',
      target: data.customer_phone,
      value: data.customer_name,
      reason: data.user_agent,
      status: 'logged',
      timestamp: data.accepted_at || new Date().toISOString(),
    })
    if (error) throw error
  } catch (e) {
    // Non-blocking — never fail the UI because of logging
    console.error('[disclaimer log]', e)
  }
}

// ══════════════════════════════════════════════════════════
// ZEVIO-NATIVE LAYER — returns flat rows (no legacy consumers)
// ══════════════════════════════════════════════════════════

// ── AI MEMORY ─────────────────────────────────────────────

export async function writeSignal(signal: Record<string, unknown>) {
  const { error } = await supabase.from('ai_memory').insert(signal)
  if (error) console.error('Signal write failed:', error)
}

export async function getRecentSignals(limit = 100) {
  const { data, error } = await supabase
    .from('ai_memory')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

// ── AI INSIGHTS ───────────────────────────────────────────

export async function writeInsight(insight: Record<string, unknown>) {
  const { error } = await supabase.from('ai_insights').insert(insight)
  if (error) throw error
}

export async function getPendingInsights() {
  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function resolveInsight(id: string) {
  const { error } = await supabase
    .from('ai_insights')
    .update({ status: 'resolved' })
    .eq('id', id)
  if (error) throw error
}

// ── AI LOG ────────────────────────────────────────────────

export async function writeLog(entry: Record<string, unknown>) {
  const { error } = await supabase.from('ai_log').insert(entry)
  if (error) console.error('Log write failed:', error)
}

// ── AI REVIEWS ────────────────────────────────────────────
// `status` carries what Airtable modelled as a `published` checkbox.

export async function getPublishedReviews(item_code: string, limit = 50) {
  const { data, error } = await supabase
    .from('ai_reviews')
    .select('*')
    .eq('item_code', item_code)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function createReview(review: Record<string, unknown>) {
  const { error } = await supabase.from('ai_reviews').insert(review)
  if (error) throw error
}

// ── AI SEO ────────────────────────────────────────────────

export async function getSEOByItemCode(item_code: string) {
  const { data } = await supabase
    .from('ai_seo')
    .select('*')
    .eq('item_code', item_code)
    .maybeSingle()
  return data ?? null
}

export async function upsertSEO(seo: Record<string, unknown>) {
  const { error } = await supabase
    .from('ai_seo')
    .upsert(seo, { onConflict: 'item_code' })
  if (error) throw error
}

// ── AI PROMOTIONS ─────────────────────────────────────────

export async function getActivePromotions() {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('ai_promotions')
    .select('*')
    .eq('status', 'active')
    .lte('starts_at', now)
    .gte('ends_at', now)
  if (error) throw error
  return data ?? []
}

// ── AI CONTENT ────────────────────────────────────────────

export async function getPublishedContent(content_type?: string) {
  let query = supabase.from('ai_content').select('*').eq('status', 'published')
  if (content_type) query = query.eq('content_type', content_type)
  const { data, error } = await query.order('published_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ─── Re-export types for convenience (same surface as lib/airtable.ts) ─────
export type { AirtableProduct, AirtableOrder, AirtableCustomer, OrderItem }
