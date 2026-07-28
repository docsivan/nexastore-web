import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server-side client — full access, never expose to browser
export const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Client-side client — anon key, safe for browser
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

// ── PRODUCTS ──────────────────────────────────────────────

export async function getActiveProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getProductByItemCode(item_code: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('item_code', item_code)
    .eq('is_active', true)
    .single()
  if (error) throw error
  return data
}

export async function getProductsByCategory(category: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('display_order', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updateProduct(
  item_code: string,
  updates: Record<string, unknown>
) {
  const { error } = await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('item_code', item_code)
  if (error) throw error
}

export async function getAllProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('display_order', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ── ORDERS ────────────────────────────────────────────────

export async function createOrder(order: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getOrders(limit = 100) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function getOrderById(order_id: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_id', order_id)
    .single()
  if (error) throw error
  return data
}

export async function updateOrder(
  order_id: string,
  updates: Record<string, unknown>
) {
  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('order_id', order_id)
  if (error) throw error
}

// ── CUSTOMERS ─────────────────────────────────────────────

export async function getCustomerByPhone(phone: string) {
  const { data } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', phone.replace(/\s/g, ''))
    .single()
  return data ?? null
}

export async function getCustomerById(customer_id: string) {
  const { data } = await supabase
    .from('customers')
    .select('*')
    .eq('customer_id', customer_id)
    .single()
  return data ?? null
}

export async function createCustomer(customer: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCustomer(
  customer_id: string,
  updates: Record<string, unknown>
) {
  const { error } = await supabase
    .from('customers')
    .update(updates)
    .eq('customer_id', customer_id)
  if (error) throw error
}

export async function getAllCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

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

// ── PRICING TIERS ─────────────────────────────────────────

export async function getPricingTiers() {
  const { data, error } = await supabase
    .from('pricing_tiers')
    .select('*')
    .order('min_quantity', { ascending: true })
  if (error) throw error
  return data ?? []
}

// ── AI SEO ────────────────────────────────────────────────

export async function getSEOByItemCode(item_code: string) {
  const { data } = await supabase
    .from('ai_seo')
    .select('*')
    .eq('item_code', item_code)
    .single()
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
  let query = supabase
    .from('ai_content')
    .select('*')
    .eq('status', 'published')
  if (content_type) query = query.eq('content_type', content_type)
  const { data, error } = await query.order('published_at', { ascending: false })
  if (error) throw error
  return data ?? []
}
