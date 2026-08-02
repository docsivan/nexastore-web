/**
 * lib/erpnext-sync.ts
 * Pushes confirmed Zevio orders into ERPNext as Sales Orders.
 *
 * Design rule: this must NEVER block or fail the customer order flow. Every
 * path returns a result object rather than throwing, and failures are written
 * to ai_log so they are recoverable/replayable rather than lost to a console.
 */

import { erpCreate, erpGet } from './erpnext'
import { writeLog } from './supabase'

/** Line item as stored on a Zevio order (see app/api/order/create). */
export interface ZevioOrderItem {
  item_code: string
  name?: string
  quantity?: number
  final_price?: number
  pack_size?: string
}

export interface SyncResult {
  success: boolean
  erp_order_id?: string
  error?: string
  skipped?: boolean
}

const ERP_COMPANY = process.env.ERPNEXT_COMPANY || 'Zevio'
const ERP_CURRENCY = process.env.ERPNEXT_CURRENCY || 'USD'

// ERPNext rejects group-type Customer Groups and Territories ("Cannot select a
// Group type Customer Group"). These are the leaf values confirmed present on
// the Zevio instance — 'All Customer Groups' / 'All Territories' are groups.
const ERP_CUSTOMER_GROUP = process.env.ERPNEXT_CUSTOMER_GROUP || 'Commercial'
const ERP_TERRITORY      = process.env.ERPNEXT_TERRITORY || 'Oman'
const ERP_ITEM_GROUP     = process.env.ERPNEXT_ITEM_GROUP || 'Products'


/** Source warehouse for stock items on a Sales Order. 'Stores - ZV' exists on
 *  the Zevio instance; the suffix is the company abbreviation. */
const ERP_WAREHOUSE = process.env.ERPNEXT_WAREHOUSE || 'Stores - ZV'

function isoDate(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86400000).toISOString().split('T')[0]
}

/** Records a sync failure so it can be retried later. Never throws. */
async function logFailure(order_id: string, stage: string, error: string) {
  try {
    await writeLog({
      timestamp:    new Date().toISOString(),
      signal_type:  'erp_sync',
      trigger_type: 'order',
      action:       'erp_sales_order',
      target:       order_id,
      field:        stage,
      value:        '',
      reason:       error.slice(0, 500),
      status:       'failed',
    })
  } catch {
    // ai_log itself is unavailable — nothing further we can safely do here
    console.error(`[erp-sync] ${order_id} ${stage} failed and could not be logged:`, error)
  }
}

/** Creates the customer in ERPNext if it is not already there. */
async function ensureERPCustomer(c: { name: string; phone?: string; email?: string }) {
  const res = await erpGet(
    'Customer',
    `filters=${encodeURIComponent(JSON.stringify([['customer_name', '=', c.name]]))}&limit_page_length=1`
  )
  if (Array.isArray(res?.data) && res.data.length > 0) return
  await erpCreate('Customer', {
    doctype:        'Customer',
    customer_name:  c.name,
    customer_type:  'Individual',
    customer_group: ERP_CUSTOMER_GROUP,
    territory:      ERP_TERRITORY,
    mobile_no:      c.phone || '',
    email_id:       c.email || '',
  })
}

/** Creates the item in ERPNext if it is not already there. */
async function ensureERPItem(item: ZevioOrderItem) {
  const res = await erpGet(
    'Item',
    `filters=${encodeURIComponent(JSON.stringify([['item_code', '=', item.item_code]]))}&limit_page_length=1`
  )
  if (Array.isArray(res?.data) && res.data.length > 0) return
  await erpCreate('Item', {
    doctype:       'Item',
    item_code:     item.item_code,
    item_name:     item.name || item.item_code,
    item_group:    ERP_ITEM_GROUP,
    stock_uom:     'Nos',
    is_stock_item: 1,
    standard_rate: Number(item.final_price ?? 0),
  })
}

/**
 * Syncs one order to ERPNext. Call fire-and-forget — do not await in the
 * request path, and do not let a rejection escape.
 */
export async function syncOrderToERP(order: {
  order_id: string
  customer_name: string
  clinic_name?: string
  phone?: string
  email?: string
  items: ZevioOrderItem[]
  total?: number
  delivery_charge?: number
  notes?: string
}): Promise<SyncResult> {
  if (!process.env.ERPNEXT_URL || !process.env.ERPNEXT_API_KEY || !process.env.ERPNEXT_API_SECRET) {
    return { success: false, skipped: true, error: 'ERPNext env vars not configured' }
  }

  const customerName = order.clinic_name?.trim() || order.customer_name?.trim()
  if (!customerName) {
    const error = 'order has no customer_name or clinic_name'
    await logFailure(order.order_id, 'validate', error)
    return { success: false, error }
  }

  const items = (order.items ?? []).filter(i => i?.item_code)
  if (!items.length) {
    const error = 'order has no line items with an item_code'
    await logFailure(order.order_id, 'validate', error)
    return { success: false, error }
  }

  try {
    await ensureERPCustomer({ name: customerName, phone: order.phone, email: order.email })
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    await logFailure(order.order_id, 'ensure_customer', error)
    return { success: false, error }
  }

  for (const item of items) {
    try {
      await ensureERPItem(item)
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      await logFailure(order.order_id, `ensure_item:${item.item_code}`, error)
      return { success: false, error }
    }
  }

  try {
    const delivery = isoDate(3)
    const result = await erpCreate('Sales Order', {
      doctype:          'Sales Order',
      customer:         customerName,
      company:          ERP_COMPANY,
      transaction_date: isoDate(0),
      delivery_date:    delivery,
      po_no:            order.order_id,
      order_type:       'Sales',
      currency:         ERP_CURRENCY,
      items: items.map(i => {
        const qty  = Number(i.quantity ?? 1)
        const rate = Number(i.final_price ?? 0)
        return {
          item_code:     i.item_code,
          item_name:     i.name || i.item_code,
          qty,
          rate,
          amount:        qty * rate,
          delivery_date: delivery,
          warehouse:     ERP_WAREHOUSE,
        }
      }),
      remarks: order.notes || `Zevio Store order ${order.order_id}`,
    })

    const erp_order_id = result?.data?.name
    return { success: true, erp_order_id }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    await logFailure(order.order_id, 'create_sales_order', error)
    return { success: false, error }
  }
}
