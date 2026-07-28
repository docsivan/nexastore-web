import { supabase } from './supabase'

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

/** Fire-and-forget behavioural signal. Never throws — logging must not break the UI. */
export async function writeSignal(signal: HayaSignal): Promise<void> {
  try {
    const { error } = await supabase.from('ai_memory').insert({
      session_id:       signal.session_id,
      customer_id:      signal.customer_id      ?? '',
      customer_segment: signal.customer_segment ?? '',
      signal_type:      signal.signal_type,
      query:            signal.query            ?? '',
      item_code:        signal.item_code        ?? '',
      action:           signal.action,
      outcome:          signal.outcome          ?? '',
      page_url:         signal.page_url,
      cart_total:       signal.cart_total       ?? 0,
      chat_summary:     signal.chat_summary     ?? '',
    })
    if (error) throw error
  } catch (e) {
    console.error('[memory] writeSignal failed (non-fatal):', e)
  }
}

export async function getCustomerMemory(customer_id: string): Promise<HayaSignal[]> {
  try {
    const { data, error } = await supabase
      .from('ai_memory')
      .select('*')
      .eq('customer_id', customer_id)
      .order('created_at', { ascending: false })
      .limit(10)
    if (error) return []
    return (data ?? []) as unknown as HayaSignal[]
  } catch {
    return []
  }
}

export async function getSessionSearches(session_id: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('ai_memory')
      .select('query')
      .eq('session_id', session_id)
      .eq('signal_type', 'search')
      .order('created_at', { ascending: false })
      .limit(5)
    if (error) return []
    return (data ?? []).map((r) => r.query ?? '').filter(Boolean)
  } catch {
    return []
  }
}
