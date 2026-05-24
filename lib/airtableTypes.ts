// ─── Generic Airtable record wrapper ─────────────────────────────────────────
export interface AirtableRecord<T> {
  id: string          // Airtable record ID  e.g. "recXXXXXXXXXXXXXX"
  fields: T
  createdTime?: string
}

// ─── Products Table ───────────────────────────────────────────────────────────
export interface ProductFields {
  item_code: string
  sku: string
  name: string
  category: string
  brand: string
  pack_size: string
  batch_number: string
  expiry_date: string
  cost_price: number
  list_price: number
  discount_percent: number
  final_price: number
  stock_quantity: number
  product_page_url: string
  image_url:        string
  is_active: boolean
  breadcrumb?:    string   // e.g. "Dental Supplies > Burs > Diamond Burs"
  // ── Haya enrichment fields ──────────────────────────────────────────────
  haya_badge?:    string
  haya_featured?: boolean
  display_order?: number
  nameAr?:        string
  descriptionAr?: string
  categoryAr?:    string
}

// ─── Orders Table ─────────────────────────────────────────────────────────────
export interface OrderFields {
  order_id: string
  created_at: string
  customer_name: string
  clinic_name: string
  phone: string
  email: string
  address: string
  city: string
  items: string           // JSON-serialised OrderItem[]
  subtotal: number
  delivery_charge: number
  total: number
  payment_status: string  // 'pending' | 'paid' | 'failed'
  delivery_status: string // 'processing' | 'dispatched' | 'delivered'
  payment_reference: string
  notes: string
}

// ─── Customers Table ──────────────────────────────────────────────────────────
export interface CustomerFields {
  customer_id: string
  customer_name: string
  clinic_name: string
  phone: string
  email: string
  address: string
  city: string
  last_order_date: string
  total_orders: number
  total_spent: number
  preferred_channel: string
  notes: string
}

// ─── Named types ──────────────────────────────────────────────────────────────
export type AirtableProduct  = AirtableRecord<ProductFields>
export type AirtableOrder    = AirtableRecord<OrderFields>
export type AirtableCustomer = AirtableRecord<CustomerFields>

// ─── Serialised order line stored in orders.items ────────────────────────────
export interface OrderItem {
  item_code: string
  name: string
  quantity: number
  final_price: number
  pack_size: string
}

// ─── Airtable list-response envelope ─────────────────────────────────────────
export interface AirtableListResponse<T> {
  records: AirtableRecord<T>[]
  offset?: string
}
