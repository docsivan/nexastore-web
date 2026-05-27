// Gemini functions re-routed through Groq/OpenRouter fallback chain.
// No Google API dependency. All signatures preserved.
import { callSonnet } from './claude'

export async function generateContent(
  prompt:      string,
  _temperature = 0.1,
  _maxTokens   = 1024
): Promise<string> {
  return callSonnet(prompt, 'You are a helpful assistant. Follow the instructions in the prompt exactly and return only what is requested.')
}

export interface ProductSummary {
  item_code: string
  name:      string
  category:  string
  brand:     string
  pack_size: string
}

export async function aiSearchProducts(
  query:    string,
  products: ProductSummary[]
): Promise<string[]> {
  const catalogue = products
    .map((p) => `${p.item_code} | ${p.name} | ${p.category} | ${p.brand} | ${p.pack_size}`)
    .join('\n')

  const prompt = `
You are a clinical procurement search assistant for NexaStore, a healthcare supply company in Oman.

Customer search query: "${query}"

Product catalogue (item_code | name | category | brand | pack_size):
${catalogue}

Your job:
- Find ALL products relevant to the search query
- Think broadly: "gloves" = nitrile gloves, surgical gloves, examination gloves, latex gloves
- Think broadly: "infection control" = hand sanitizer, disinfectant, surface wipes, masks, gloves, PPE
- Think broadly: "dental" = any dental category product
- Think broadly: "medical devices" = any diagnostic or medical equipment
- Think broadly: "sterilization" = autoclave, sterilizer, pouches, indicators
- Match on name, category, brand, and clinical synonyms
- If query is a category name, return ALL products in that category
- Return ONLY a valid JSON array of matching item_codes, no explanation
- Maximum 8 results ordered by relevance
- If truly nothing matches, return []

JSON array only:
["item_code1", "item_code2"]
`.trim()

  const raw   = await generateContent(prompt, 0.1, 512)
  const match = raw.match(/\[[\s\S]*?\]/)
  if (!match) return []

  try {
    const codes = JSON.parse(match[0])
    return Array.isArray(codes) ? codes.filter((c: unknown) => typeof c === 'string') : []
  } catch {
    return []
  }
}

export interface WhatsAppContext {
  type:          'product' | 'cart' | 'order' | 'general'
  productName?:  string
  productSku?:   string
  productBrand?: string
  cartItems?:    { name: string; quantity: number }[]
  cartTotal?:    number
  orderId?:      string
  customerName?: string
}

export async function generateWhatsAppMessage(ctx: WhatsAppContext): Promise<string> {
  let contextDesc = ''

  switch (ctx.type) {
    case 'product':
      contextDesc = `The customer is viewing a product: "${ctx.productName}" (SKU: ${ctx.productSku}, Brand: ${ctx.productBrand})`
      break
    case 'cart': {
      const itemList = ctx.cartItems?.map((i) => `${i.name} x${i.quantity}`).join(', ') ?? ''
      contextDesc = `The customer has these items in their cart: ${itemList}. Total: OMR ${ctx.cartTotal?.toFixed(3)}`
      break
    }
    case 'order':
      contextDesc = `The customer just placed Order #${ctx.orderId}`
      break
    default:
      contextDesc = 'The customer needs general assistance'
  }

  const prompt = `
You are helping a customer of NexaStore (a medical supply company in Oman) write a brief WhatsApp opening message to the support team.

Context: ${contextDesc}
${ctx.customerName ? `Customer name: ${ctx.customerName}` : ''}

Write a short, friendly, professional WhatsApp message in English that:
- Greets NexaStore
- Clearly states what the customer needs help with
- Is natural and conversational (not robotic)
- Maximum 3 sentences
- Do not include phone numbers, links or special characters

Return ONLY the message text, nothing else.
`.trim()

  const message = await generateContent(prompt, 0.7, 256)
  return message || `Hello NexaStore, I need assistance. Please help me.`
}
