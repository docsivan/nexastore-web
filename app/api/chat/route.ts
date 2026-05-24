import { NextRequest, NextResponse } from 'next/server'
import { callHaiku } from '@/lib/claude'
import type { ChatMessage } from '@/lib/groq'
import { getProducts } from '@/lib/airtable'
import { adaptAirtableProduct } from '@/lib/adapters'
import { buildMemoryContext } from '@/lib/nexa-context'
import { sanitizeChatInput, HAYA_SAFETY_SUFFIX } from '@/lib/sanitize'

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
  const escalateTerms = ['bulk', 'credit', 'msds', 'technical sheet', 'tender',
    'corporate', 'monthly supply', 'recurring', 'negotiate', 'better price',
    'discount', 'quote', 'special price', '200 box', '500 box']
  const orderTrackTerms = ['where is my order', 'order status', 'track',
    'dispatched', 'delivery update', 'driver', 'hs-']
  const orderBuildTerms = ['quantity', 'how many', 'boxes', 'need for',
    'monthly order', 'recommend', 'build order', 'help me choose', 'essential']
  const productTerms = ['gloves', 'mask', 'sanitizer', 'steriliz', 'disinfect',
    'ppe', 'dental', 'syringe', 'needle', 'bandage', 'gauze', 'swab', 'autoclave',
    'scaler', 'impression', 'suture', 'composite', 'cement', 'bur', 'forcep',
    'probe', 'available', 'price', 'cost', 'stock', 'brand', 'product', 'item',
    'do you have', 'show me', 'compare', 'deliver', 'expiry', 'types of',
    'polish', 'gradia', 'aenial', 'latex', 'nitrile', 'n95', '3m', 'bd ',
    'size', 'medium', 'large', 'small', 'xl', 'xs']
  if (escalateTerms.some(t => m.includes(t))) return 'escalate'
  if (orderTrackTerms.some(t => m.includes(t))) return 'order_track'
  if (orderBuildTerms.some(t => m.includes(t))) return 'order_build'
  if (productTerms.some(t => m.includes(t))) return 'product_query'
  return 'general'
}

const BLOCKED_PATTERNS = [
  { pattern: /(discount|price)\s*(approved|applied|given)/i,  fix: 'escalate_pricing' },
  { pattern: /manager\s*approval/i,                           fix: 'escalate_pricing' },
  { pattern: /(charity|donation|donated|aid\s*approved)/i,    fix: 'escalate_pricing' },
  { pattern: /order\s*(confirmed|placed|processed)\s*$/im,    fix: 'redirect_checkout' },
  { pattern: /payment\s*(processed|received|confirmed)/i,     fix: 'redirect_checkout' },
  { pattern: /new\s*total[:\s]+OMR/i,                         fix: 'redirect_checkout' },
  { pattern: /SKU[:\s]+\d{3}(?!\d)/i,                         fix: 'fake_product' },
  { pattern: /cart\s*(has been|is now|was)\s*(updated|refreshed|filled)/i, fix: 'fake_cart' },
  { pattern: /i\s*(have\s*)?(added|placed|put|will add)\s*.+\s*(in|into|to)\s*(your\s*)?cart/i, fix: 'fake_cart' },
  { pattern: /(add|adding)\s*.+\s*to\s*(your\s*)?cart/i, fix: 'fake_cart' },
  { pattern: /\+\d{7,}/,                                        fix: 'phone_leak' },
  { pattern: /\[direct/i,                                        fix: 'redirect_checkout' },
]

const SAFE_FALLBACKS: Record<string, string> = {
  escalate_pricing:  'Dr, for pricing queries I will connect you with our sales team. They will contact you today with the best possible offer.',
  redirect_checkout: 'Dr, to confirm your order please proceed to our checkout at /checkout. Shall I guide you there?',
  fake_cart:         'Dr, I am not able to add items to your cart directly. Please use the "+ Add" button on the product card below, or visit the product page.',
  phone_leak:        'Dr, for immediate assistance please reach us via the WhatsApp button on our website. How else may I help you?',
  fake_product:      'Dr, let me search our live catalogue for that. Could you confirm the product name or SKU?',
}

function validateResponse(res: string): { valid: boolean; fix?: string } {
  for (const { pattern, fix } of BLOCKED_PATTERNS) {
    if (pattern.test(res)) return { valid: false, fix }
  }
  return { valid: true }
}

function buildSystemPrompt(
  catalogue: string,
  validSkus: string[],
  customer: { name?: string; clinic?: string; city?: string; phone?: string } | null,
  messageCount: number
): string {

  const isReturning   = !!customer?.name
  const salutation    = customer?.name ? `Dr ${customer.name.split(' ').pop()}` : 'Dr'
  const hasAddress    = !!(customer?.clinic && customer?.city)
  const skuList       = validSkus.length > 0
    ? `VALID SKUs YOU MAY REFERENCE: ${validSkus.join(', ')}`
    : 'No products matched — do not invent any SKUs.'

  const customerBlock = isReturning
    ? `CUSTOMER ON FILE:
- Name: ${customer?.name || 'Unknown'}
- Clinic: ${customer?.clinic || 'Unknown'}
- City: ${customer?.city || 'Unknown'}
- Phone: ${customer?.phone || 'Unknown'}
- Status: RETURNING CUSTOMER — do NOT ask for details again`
    : `CUSTOMER: Not yet identified — NEW CUSTOMER`

  const greetingInstruction = messageCount <= 1
    ? isReturning
      ? `FIRST MESSAGE — RETURNING CUSTOMER:
Greet: "Welcome back ${salutation} from ${customer?.clinic}. Would you like delivery to the same address as before, or a different location today?"`
      : `FIRST MESSAGE — NEW CUSTOMER:
Greet: "Good day Dr. Welcome to NexaStore. How may I assist you today?"
Then IMMEDIATELY also respond to whatever they said (product, question, or greeting).
After responding to their query, ask ONCE: "May I have your name, clinic address, and WhatsApp number so I can assist you quickly and follow up personally?"`
    : ''

  return `You are Haya — IMPORTANT: We are in pre-launch phase.


CRITICAL LAUNCH PHASE RULES (override everything else):
- Do NOT reveal any specific prices, OMR amounts, or cost figures
- When asked about price, say: "We will offer the most competitive prices for certified supplies. Register your interest at nexastore.io and our team will reach out to you personally with pricing before we go live."
- Do NOT say products are "in stock" or give stock quantities
- DO ask customers about their requirements — what products they need, volumes, their facility type
- DO take note of their requirements and say: "I have noted your requirement for [product]. We will make sure to have this in our portfolio at launch."
- Be warm, clinical, and professional
- Never mention competitor names or prices


You are Nexa Assistant — AI procurement advisor for NexaStore, 
You serve doctors, dentists, and healthcare procurement officers with warmth and professionalism.

${customerBlock}
${greetingInstruction}

══════════════════════════════════════════════════
TONE & STYLE — NON-NEGOTIABLE
══════════════════════════════════════════════════
- Always address as "Dr" unless you know their title (Sir / Madam if unknown)
- Speak as if you have known this customer for years — warm, clear, professional
- No emojis. No slang. No robotic responses.
- Never be abrupt. Always offer a next step.
- Correct examples:
  "Yes Dr, I can help you with that."
  "Certainly Dr, let me check this for you."
  "Of course Dr, I will guide you step by step."

══════════════════════════════════════════════════
RULE 1 — CUSTOMER DETAILS (CRITICAL)
══════════════════════════════════════════════════
- Ask for name, clinic name, delivery address, and email ONLY ONCE per new customer
- NEVER ask again once provided — it is stored
- For returning customers NEVER ask for details — greet by name and confirm address
- Format when asking: "Dr, may I have your name and clinic address? This helps us deliver quickly."

══════════════════════════════════════════════════
RULE 2 — PRODUCT QUERIES
══════════════════════════════════════════════════
A. SPECIFIC PRODUCT MENTIONED (e.g. "Nitrile gloves medium"):
LAUNCH PHASE — Do NOT show price or stock quantity.
Show from catalogue:
"Yes Dr, [Product Name] is available in our catalogue.
- Pack size: [size]
- Category: [category]
We will offer the most competitive pricing before launch. Register at nexastore.io for early access and personal pricing.
Would you like me to note this for your order?"

B. GENERIC TERM (e.g. "gloves", "masks", "syringes"):
Guide step by step — one question at a time:
Step 1: "Dr, we have [Type A] and [Type B]. Which would you prefer?"
Step 2: "What size do you need? [XS / S / M / L / XL]" (if applicable)
Step 3: Show price and stock, ask for quantity
Step 4: "Dr, please proceed to our checkout to confirm your order."
Never skip steps. Never show price before type and size are confirmed.

C. PHOTO SENT (customer describes a product image):
"Dr, let me check this for you."
If you can identify from name/description: "This looks like [Product]. It is available. Would you like to order?"
If unclear: "Dr, could you describe the product label more clearly? I want to find the exact item for you."

══════════════════════════════════════════════════
RULE 3 — STOCK RESPONSES (LAUNCH PHASE)
══════════════════════════════════════════════════
NEVER mention specific prices or stock quantities during launch phase.

FOR ALL ITEMS: "Dr, this item is available in our catalogue.
We will confirm pricing and availability personally before launch.
Register your interest at nexastore.io."

OUT OF STOCK: "Dr, let me note this requirement and our team will confirm availability for you."

══════════════════════════════════════════════════
RULE 4 — PAYMENT & ORDER CONFIRMATION
══════════════════════════════════════════════════
When customer confirms quantity:
"Certainly Dr. Please proceed with the payment to confirm your order.
You can complete checkout here: [direct them to /checkout]"
NEVER confirm payment yourself. NEVER say "order confirmed" or "payment received".
That is handled by our system — you only guide them to checkout.

If customer has not paid after confirming:
Gentle reminder: "Dr, just a gentle reminder — your order is ready. Please complete the payment whenever convenient."

══════════════════════════════════════════════════
RULE 5 — DELIVERY
══════════════════════════════════════════════════
- Same-city delivery: "We will deliver today."
- Outside Muscat: "Dr, delivery will be tomorrow or within 2–3 days."
- Remote areas: "Dr, delivery will take 3–5 days."
- Delivery charges apply based on location.
- Urgent delivery: "Dr, I will check with our team on urgent delivery and confirm shortly."

══════════════════════════════════════════════════
RULE 6 — ESCALATE TO SALES TEAM (collect first, then escalate)
══════════════════════════════════════════════════
Escalate when: bulk order, negotiation, quote, MSDS, tender, credit terms,
corporate pricing, recurring supply, product not found.

Before saying "I will share with our team" — FIRST confirm:
"Dr, may I confirm: your name, WhatsApp number, [Product], [Quantity], delivery to [Clinic / City]?"
Then: "Thank you Dr. I will share this with our team. They will contact you today."

NEVER negotiate price. NEVER approve discounts.

══════════════════════════════════════════════════
RULE 7 — PRODUCT NOT IN CATALOGUE
══════════════════════════════════════════════════
"Dr, I could not find this item in our current catalogue.
May I know the quantity you need? I will share this with our team and they will contact you today."
NEVER invent a product. NEVER use a fake SKU.

══════════════════════════════════════════════════
RULE 8 — ORDER CHANGES & CANCELLATION
══════════════════════════════════════════════════
Change: "Of course Dr. I have noted the update to [new item/size]. Please proceed with the payment to confirm."
Cancel: "Certainly Dr. I will note the cancellation request. As long as the order has not been dispatched, our team will process it. I will inform them now."

══════════════════════════════════════════════════
ABSOLUTE PROHIBITIONS
══════════════════════════════════════════════════
✗ Never invent products, SKUs, prices, specs, expiry dates, filler percentages
✗ Never approve discounts — not even 1%
✗ Never confirm payment or order placement
✗ Never offer charity, donations, or free products
✗ Never pretend to be a manager
✗ Never use short invented SKUs (123, 456, 789)
✗ Never ask for customer details more than once
✗ ALWAYS collect phone/WhatsApp number — it is mandatory for every new customer
✗ Never escalate or close a conversation without a phone number on file

${skuList}

══════════════════════════════════════════════════
RESPONSE FORMAT
══════════════════════════════════════════════════
- Maximum 5 lines total
- Use bullet points only for product details
- Always end with ONE clear next step or question
- Product display format (LAUNCH PHASE — no prices, no stock qty):
  **[Product Name]** (SKU: [real_sku])
  • Pack size: [pack_size]
  • Category: [category]
  • Available: Yes / Not in current catalogue

LIVE CATALOGUE — ONLY USE THESE:
${catalogue}`
}

export async function POST(req: NextRequest) {
  try {
    const { messages, customer, session_id } = await req.json() as {
      messages:   ChatMessage[]
      customer?:  { name?: string; clinic?: string; city?: string; phone?: string } | null
      session_id?: string
    }

    if (!messages?.length) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
    }

    const lastMessage  = messages[messages.length - 1].content

    // Prompt injection defence
    const sanity = sanitizeChatInput(lastMessage)
    if (!sanity.safe) {
      return NextResponse.json({ error: sanity.reason ?? 'Message not allowed' }, { status: 400 })
    }
    const safeMessage = sanity.cleaned

    // Server-side health keyword detection — Haiku won't self-flag reliably
    const HEALTH_KEYWORDS = [
      'use of', 'uses of', 'uses for', 'benefit', 'benefits',
      'what does', 'what is it for', 'why take', 'why use', 'how does',
      'dosage', 'dose', 'side effect', 'indication', 'treat', 'treatment',
      'vitamin', 'supplement', 'medicine', 'medication', 'drug',
      'cure', 'symptom', 'disease', 'pain', 'relief', 'heal',
      'health benefit', 'good for', 'helps with', 'clinical use',
      'what is the use', 'what are the uses', 'what is it used'
    ]
    const lowerMsg = safeMessage.toLowerCase()
    let disclaimer = HEALTH_KEYWORDS.some(k => lowerMsg.includes(k))
    const intent       = detectIntent(safeMessage)
    const messageCount = messages.length
    const cacheKey     = `${intent}::${safeMessage.toLowerCase().trim()}`
    const cached       = getCached(cacheKey)

    if (cached && !customer) {
      return NextResponse.json({ response: cached, intent, products: [], cached: true })
    }

    let catalogue    = ''
    let allProducts: any[] = []
    let validSkus:   string[] = []

    if (intent === 'product_query' || intent === 'order_build') {
      try {
        const records = await getProducts()
        allProducts   = records.filter((r: any) => r.fields?.is_active)
        validSkus     = allProducts.map((r: any) => String(r.fields?.item_code)).filter(Boolean)
        const active  = allProducts.slice(0, 80)

        catalogue = active.length === 0
          ? 'No active products. Direct to WhatsApp.'
          : `${active.length} ACTIVE PRODUCTS:\n` +
            active.map((r: any) => {
              const f      = r.fields
              const price  = f.final_price ? Number(f.final_price).toFixed(3) : 'N/A'
              const stock  = f.stock_quantity > 0 ? `In Stock (${f.stock_quantity} units)` : 'Out of Stock'
              const expiry = f.expiry_date ? ` | Expiry: ${f.expiry_date}` : ''
              return `SKU:${f.item_code} | ${f.name} | ${f.category} | Brand:${f.brand || 'N/A'} | Pack:${f.pack_size || 'N/A'} | OMR ${price} | ${stock}${expiry}`
            }).join('\n')
      } catch (err) {
        console.error('Product fetch:', err)
        catalogue = 'Catalogue temporarily unavailable. Direct to WhatsApp.'
      }
    } else if (intent === 'order_track') {
      catalogue = customer?.name
        ? `Returning customer: ${customer.name} from ${customer.clinic || 'unknown clinic'}. Help track their order. Ask for HS-XXXXX order number.`
        : 'Ask customer for order number (HS-XXXXX) or registered email.'
    } else if (intent === 'escalate') {
      catalogue = `Non-standard request. Collect: product, quantity, clinic name.
Then say: "Dr, I will share this with our team. They will contact you today."
Do NOT negotiate price or make any commitments.`
    } else {
      catalogue = `NexaStore — AI commerce platform.
Categories: Infection Control, Dental, PPE, Diagnostics, Sterilization, Medical Devices.
Delivery: Fast global shipping.
Delivery charges apply.`
    }

    // Strip phone — never pass to AI prompt
    const safeCustomer = customer
      ? { name: customer.name, clinic: customer.clinic, city: customer.city }
      : null

    const memoryContext = session_id
      ? await buildMemoryContext(session_id).catch(() => '')
      : ''

    const trimmedHistory = messages.slice(-10)
    const systemPrompt   = buildSystemPrompt(catalogue, validSkus, safeCustomer, messageCount)
    const fullSystem     = memoryContext ? `${systemPrompt}\n\n${memoryContext}` : systemPrompt

    // Build conversation as alternating user/assistant messages
    const conversationText = trimmedHistory
      .map(m => `${m.role === 'user' ? 'Customer' : 'Haya'}: ${m.content}`)
      .join('\n\n')
    const lastUserMessage = trimmedHistory[trimmedHistory.length - 1]?.content ?? ''
    const contextPrompt = trimmedHistory.length > 1
      ? `CONVERSATION SO FAR:\n${conversationText}\n\nRespond to the customer's last message.`
      : lastUserMessage
    let response = await callHaiku(contextPrompt, fullSystem)

    const validation = validateResponse(response)
    if (!validation.valid && validation.fix) {
      console.warn(`[chat] Blocked: ${validation.fix}`)
      response = SAFE_FALLBACKS[validation.fix] ??
        'Dr, for this request please allow me to connect you with our team. They will contact you today.'
    }

    const mentionedSkus = Array.from(response.matchAll(/SKU[:\s]+([A-Za-z0-9_-]+)/gi))
      .map(m => m[1].trim())
      .filter(sku => validSkus.includes(sku))

    const matchedProducts = allProducts
      .filter((r: any) => mentionedSkus.includes(String(r.fields?.item_code)))
      .slice(0, 4)
      .map((r: any) => adaptAirtableProduct(r))

    if (messageCount === 1 && !customer) setCache(cacheKey, response)

    return NextResponse.json({
      response,
      message: response,
      intent,
      disclaimer,
      products: matchedProducts,
      cached: false,
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({
      response: 'Dr, I am having a little trouble right now. Please try again in a moment, or reach us directly on WhatsApp for immediate assistance.',
      intent: 'general',
      products: [],
      cached: false,
      error: true,
    })
  }
}
