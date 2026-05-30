/**
 * scripts/auto-categorise.mjs
 * Reads products from Airtable, calls Groq to assign category + price,
 * then patches results back to Airtable in batches of 10.
 *
 * Run: node scripts/auto-categorise.mjs
 */

import { readFileSync } from 'fs'

// ─── Load .env.local ──────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#') && !l.startsWith('//'))
    .map(l => {
      const idx = l.indexOf('=')
      const key = l.slice(0, idx).trim()
      const val = l.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
      return [key, val]
    })
    .filter(([k]) => k.length > 0)
)

const AIRTABLE_API_KEY = env.AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = env.AIRTABLE_BASE_ID
const GROQ_API_KEY     = env.GROQ_API_KEY

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ AIRTABLE_API_KEY or AIRTABLE_BASE_ID missing from .env.local')
  process.exit(1)
}
if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY missing from .env.local')
  process.exit(1)
}

const AT_BASE = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`
const AT_HEADERS = {
  Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
}

// ─── Step 1: Fetch products ───────────────────────────────────────────────────
console.log('📦 Fetching products from Airtable...')

const fetchUrl = new URL(`${AT_BASE}/Products`)
fetchUrl.searchParams.set('pageSize', '100')
fetchUrl.searchParams.append('fields[]', 'name')
fetchUrl.searchParams.append('fields[]', 'brand')
fetchUrl.searchParams.append('fields[]', 'category')
fetchUrl.searchParams.append('fields[]', 'final_price')
fetchUrl.searchParams.append('fields[]', 'list_price')

const fetchRes = await fetch(fetchUrl.toString(), {
  headers: AT_HEADERS,
  cache: 'no-store',
})

if (!fetchRes.ok) {
  const body = await fetchRes.text()
  console.error(`❌ Airtable fetch failed (${fetchRes.status}):`, body.slice(0, 300))
  if (fetchRes.status === 401) {
    console.error('   → AIRTABLE_API_KEY is revoked. Generate a new token at airtable.com → Developer Hub → Personal access tokens.')
  }
  process.exit(1)
}

const fetchData = await fetchRes.json()
const products = fetchData.records ?? []

console.log(`✅ Fetched ${products.length} products`)

if (products.length === 0) {
  console.log('⚠️  No products found — check base ID and Products table name.')
  process.exit(0)
}

// ─── Step 2: Call Groq for category + price assignment ────────────────────────
console.log(`\n🤖 Calling Groq (llama-3.1-8b-instant) to categorise ${products.length} products...`)

const systemPrompt = `You are a cosmetics product categoriser.
Return ONLY valid JSON array, no markdown, no explanation.`

const userPrompt = `Assign a category and realistic USD retail price to each product.
Categories must be ONLY one of:
Moisturisers, Serums, Cleansers, Sunscreen,
Treatments, Body Care, Hair Care, Tools & Devices, Makeup

Rules:
- Price must be realistic USD retail (e.g. CeraVe $18, La Roche-Posay $35, Fenty Beauty $42, FOREO $199)
- list_price = retail price
- final_price = list_price * 0.85 (15% platform discount)
- Round to 2 decimal places

Return JSON array:
[
  {
    "id": "recXXXXXX",
    "category": "Serums",
    "list_price": 35.00,
    "final_price": 29.75
  }
]

Products:
${JSON.stringify(products.map(p => ({
  id: p.id,
  name: p.fields.name ?? '',
  brand: p.fields.brand ?? '',
})), null, 2)}`

const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${GROQ_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 8000,
  }),
})

if (!groqRes.ok) {
  const body = await groqRes.text()
  console.error(`❌ Groq API failed (${groqRes.status}):`, body.slice(0, 300))
  process.exit(1)
}

const groqData = await groqRes.json()
const rawContent = groqData.choices?.[0]?.message?.content ?? ''

console.log(`✅ Groq responded (${rawContent.length} chars)`)

// ─── Step 3: Parse Groq response ──────────────────────────────────────────────
let assignments = []

try {
  // Direct parse first
  assignments = JSON.parse(rawContent)
} catch {
  try {
    // Strip markdown fences
    const cleaned = rawContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    assignments = JSON.parse(cleaned)
  } catch {
    try {
      // Extract JSON array from surrounding text
      const match = rawContent.match(/\[[\s\S]*?\](?=\s*$)/m)
        ?? rawContent.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('No JSON array found')
      assignments = JSON.parse(match[0])
    } catch (e) {
      console.error('❌ Failed to parse Groq JSON response:', e.message)
      console.error('Raw response (first 500 chars):', rawContent.slice(0, 500))
      process.exit(1)
    }
  }
}

if (!Array.isArray(assignments) || assignments.length === 0) {
  console.error('❌ Parsed response is not a non-empty array')
  process.exit(1)
}

console.log(`✅ Parsed ${assignments.length} product assignments`)

// Validate each assignment has required fields
const valid = assignments.filter(a =>
  a.id && a.category && typeof a.list_price === 'number' && typeof a.final_price === 'number'
)
const invalid = assignments.length - valid.length
if (invalid > 0) {
  console.warn(`⚠️  Skipping ${invalid} assignments with missing/invalid fields`)
}

// ─── Step 4: Batch PATCH to Airtable (10 per batch, 250ms delay) ───────────
console.log(`\n📝 Writing ${valid.length} products back to Airtable in batches of 10...`)

const BATCH_SIZE = 10
let updated = 0

for (let i = 0; i < valid.length; i += BATCH_SIZE) {
  const batch = valid.slice(i, i + BATCH_SIZE)
  const batchNum = Math.floor(i / BATCH_SIZE) + 1
  const totalBatches = Math.ceil(valid.length / BATCH_SIZE)

  const patchBody = {
    records: batch.map(a => ({
      id: a.id,
      fields: {
        category:    a.category,
        list_price:  Math.round(a.list_price  * 100) / 100,
        final_price: Math.round(a.final_price * 100) / 100,
      },
    })),
  }

  const patchRes = await fetch(`${AT_BASE}/Products`, {
    method:  'PATCH',
    headers: AT_HEADERS,
    body:    JSON.stringify(patchBody),
  })

  if (!patchRes.ok) {
    const body = await patchRes.text()
    console.error(`❌ Batch ${batchNum}/${totalBatches} failed (${patchRes.status}):`, body.slice(0, 200))
  } else {
    updated += batch.length
    process.stdout.write(`   Batch ${batchNum}/${totalBatches} ✓\r`)
  }

  // Respect Airtable rate limits
  await new Promise(r => setTimeout(r, 250))
}

// ─── Step 5: Summary ─────────────────────────────────────────────────────────
console.log(`\n✅ Updated ${updated} products with categories and prices\n`)

const categoryCount = {}
for (const a of valid) {
  categoryCount[a.category] = (categoryCount[a.category] ?? 0) + 1
}

console.log('📊 Category breakdown:')
Object.entries(categoryCount)
  .sort(([, a], [, b]) => b - a)
  .forEach(([cat, count]) => {
    const bar = '█'.repeat(Math.round(count / valid.length * 20))
    console.log(`   ${cat.padEnd(18)} ${String(count).padStart(3)}  ${bar}`)
  })

console.log('\n🔍 Sample (first 5):')
valid.slice(0, 5).forEach(a => {
  const product = products.find(p => p.id === a.id)
  const name = product?.fields?.name ?? a.id
  console.log(`   ${name.slice(0, 40).padEnd(40)} → ${a.category.padEnd(18)} $${a.list_price} → $${a.final_price}`)
})
