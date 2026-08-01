import { NextRequest, NextResponse } from 'next/server'
import { callHaiku } from '@/lib/claude'
import type { ChatMessage } from '@/lib/groq'
import { getProducts } from '@/lib/supabase'
import { adaptAirtableProduct } from '@/lib/adapters'
import { buildMemoryContext } from '@/lib/nexa-context'
import { sanitizeChatInput } from '@/lib/sanitize'
import { getStoreContext, buildSystemPrompt, getCustomerOrders } from '@/lib/ai-context'

const cache = new Map<string, { response: string; ts: number }>()
const CACHE_TTL = 60 * 60 * 1000

function getCached(key: string): string | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null }
  return entry.response
}
function setCache(key: string, response: string) {
  cache.set(key, { response, ts: Date.now() })
}

type Intent = 'product_query' | 'order_track' | 'order_build' | 'escalate' | 'general'

function detectIntent(message: string): Intent {
  const m = message.toLowerCase()
  const escalateTerms = [
    'bulk', 'credit', 'technical sheet', 'corporate', 'monthly supply',
    'recurring', 'negotiate', 'better price', 'discount', 'quote', 'special price',
  ]
  const orderTrackTerms = [
    'where is my order', 'order status', 'track', 'dispatched', 'delivery update',
  ]
  const orderBuildTerms = [
    'quantity', 'how many', 'need for', 'monthly order', 'recommend',
    'build order', 'help me choose',
  ]
  const productTerms = [
    'available', 'price', 'cost', 'stock', 'brand', 'product', 'item',
    'do you have', 'show me', 'compare', 'deliver', 'size', 'pack',
  ]
  if (escalateTerms.some(t => m.includes(t)))    return 'escalate'
  if (orderTrackTerms.some(t => m.includes(t)))  return 'order_track'
  if (orderBuildTerms.some(t => m.includes(t)))  return 'order_build'
  if (productTerms.some(t => m.includes(t)))     return 'product_query'
  return 'general'
}

const BLOCKED_PATTERNS = [
  { pattern: /(discount|price)\s*(approved|applied|given)/i,   fix: 'escalate_pricing' },
  { pattern: /manager\s*approval/i,                            fix: 'escalate_pricing' },
  { pattern: /(charity|donation|donated|aid\s*approved)/i,     fix: 'escalate_pricing' },
  { pattern: /order\s*(confirmed|placed|processed)\s*$/im,     fix: 'redirect_checkout' },
  { pattern: /payment\s*(processed|received|confirmed)/i,      fix: 'redirect_checkout' },
  { pattern: /new\s*total[:\s]+\$/i,                           fix: 'redirect_checkout' },
  { pattern: /SKU[:\s]+\d{3}(?!\d)/i,                          fix: 'fake_product' },
  { pattern: /cart\s*(has been|is now|was)\s*(updated|refreshed|filled)/i, fix: 'fake_cart' },
  { pattern: /i\s*(have\s*)?(added|placed|put|will add)\s*.+\s*(in|into|to)\s*(your\s*)?cart/i, fix: 'fake_cart' },
  { pattern: /(add|adding)\s*.+\s*to\s*(your\s*)?cart/i,       fix: 'fake_cart' },
  { pattern: /\+\d{7,}/,                                        fix: 'phone_leak' },
  { pattern: /\[direct/i,                                        fix: 'redirect_checkout' },
]

const SAFE_FALLBACKS: Record<string, string> = {
  escalate_pricing:  'For pricing queries I will connect you with our sales team — they will contact you today with the best offer.',
  redirect_checkout: 'To confirm your order please proceed to our checkout at /checkout. Shall I guide you there?',
  fake_cart:         'I cannot add items to your cart directly. Please use the "+ Add" button on the product card, or visit the product page.',
  phone_leak:        'For immediate assistance please reach us via the contact options on our website. How else may I help you?',
  fake_product:      'Let me search our live catalogue for that. Could you confirm the product name or SKU?',
}

function validateResponse(res: string): { valid: boolean; fix?: string } {
  for (const { pattern, fix } of BLOCKED_PATTERNS) {
    if (pattern.test(res)) return { valid: false, fix }
  }
  return { valid: true }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, customer, session_id } = await req.json() as {
      messages:    ChatMessage[]
      customer?:   { name?: string; clinic?: string; city?: string; phone?: string } | null
      session_id?: string
    }

    if (!messages?.length) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1].content
    const sanity      = sanitizeChatInput(lastMessage)
    if (!sanity.safe) {
      return NextResponse.json({ error: sanity.reason ?? 'Message not allowed' }, { status: 400 })
    }
    const safeMessage = sanity.cleaned

    const intent       = detectIntent(safeMessage)
    const messageCount = messages.length
    const cacheKey     = `${intent}::${safeMessage.toLowerCase().trim()}`
    const cached       = getCached(cacheKey)

    if (cached && !customer) {
      return NextResponse.json({ response: cached, intent, products: [], cached: true })
    }

    // Build context from the AI context engine
    const storeContext   = await getStoreContext()
    const customerOrders = customer?.phone
      ? await getCustomerOrders(customer.phone)
      : 'Guest session'
    const systemPrompt   = buildSystemPrompt(storeContext, customerOrders)

    // Fetch live product list for SKU validation and product card rendering
    let allProducts: Array<Record<string, unknown>> = []
    let validSkus:   string[] = []

    if (intent === 'product_query' || intent === 'order_build') {
      try {
        const records = await getProducts()
        allProducts   = (records as unknown as Array<Record<string, unknown>>)
          .filter(r => r?.is_active)
        validSkus     = allProducts
          .map(r => String(r?.item_code))
          .filter(Boolean)
      } catch (err) {
        console.error('Product fetch:', err)
      }
    }

    const memoryContext = session_id
      ? await buildMemoryContext(session_id).catch(() => '')
      : ''

    const trimmedHistory = messages.slice(-10)
    const fullSystem     = memoryContext ? `${systemPrompt}\n\n${memoryContext}` : systemPrompt

    const conversationText = trimmedHistory
      .map(m => `${m.role === 'user' ? 'Customer' : storeContext.aiName}: ${m.content}`)
      .join('\n\n')
    const lastUserMessage = trimmedHistory[trimmedHistory.length - 1]?.content ?? ''
    const contextPrompt   = trimmedHistory.length > 1
      ? `CONVERSATION SO FAR:\n${conversationText}\n\nRespond to the customer's last message.`
      : lastUserMessage

    let response = await callHaiku(contextPrompt, fullSystem)

    const validation = validateResponse(response)
    if (!validation.valid && validation.fix) {
      console.warn(`[chat] Blocked: ${validation.fix}`)
      response = SAFE_FALLBACKS[validation.fix] ??
        'For this request please allow me to connect you with our team. They will contact you today.'
    }

    const mentionedSkus = Array.from(response.matchAll(/SKU[:\s]+([A-Za-z0-9_-]+)/gi))
      .map(m => m[1].trim())
      .filter(sku => validSkus.includes(sku))

    const matchedProducts = allProducts
      .filter(r => mentionedSkus.includes(String(r?.item_code)))
      .slice(0, 4)
      .map(r => adaptAirtableProduct(r as unknown as Parameters<typeof adaptAirtableProduct>[0]))

    if (messageCount === 1 && !customer) setCache(cacheKey, response)

    return NextResponse.json({
      response,
      message: response,
      intent,
      products: matchedProducts,
      cached:   false,
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({
      response: 'I am having a little trouble right now. Please try again in a moment, or reach us directly for immediate assistance.',
      intent:   'general',
      products: [],
      cached:   false,
      error:    true,
    })
  }
}
