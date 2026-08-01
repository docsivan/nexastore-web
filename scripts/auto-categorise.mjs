/**
 * scripts/auto-categorise.mjs
 * Reads products from Airtable, calls Groq in batches of 25 to assign
 * category + price, then patches results back to Airtable in batches of 10.
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

console.log(`🔑 Key prefix: ${AIRTABLE_API_KEY.slice(0, 12)}...`)

const AT_BASE = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`
const AT_HEADERS = {
  Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
}

const SYSTEM_PROMPT = `You are a cosmetics product categoriser.
Return ONLY valid JSON array, no markdown, no explanation.`

// Must match existing singleSelect options in Airtable Products.category field exactly
const CATEGORIES = [
  'Skincare', 'Serums & Actives', 'Personal Care', 'Sun Care',
  'Body & Hair', 'Pro Tools', 'Cosmetics',
]

// ─── Step 1: Fetch all products ───────────────────────────────────────────────
console.log('\n📦 Fetching products from Airtable...')

const fetchUrl = new URL(`${AT_BASE}/Products`)
fetchUrl.searchParams.set('pageSize', '100')
fetchUrl.searchParams.append('fields[]', 'name')
fetchUrl.searchParams.append('fields[]', 'brand')
fetchUrl.searchParams.append('fields[]', 'category')
fetchUrl.searchParams.append('fields[]', 'final_price')
fetchUrl.searchParams.append('fields[]', 'list_price')

const fetchRes = await fetch(fetchUrl.toString(), { headers: AT_HEADERS })

if (!fetchRes.ok) {
  const body = await fetchRes.text()
  console.error(`❌ Airtable fetch failed (${fetchRes.status}):`, body.slice(0, 300))
  if (fetchRes.status === 401) {
    console.error('   → API key is revoked. Generate a new token at airtable.com → Developer Hub.')
  }
  process.exit(1)
}

const fetchData = await fetchRes.json()
const products  = fetchData.records ?? []
console.log(`✅ Fetched ${products.length} products`)

if (products.length === 0) {
  console.log('⚠️  No products found — check base ID and Products table name.')
  process.exit(0)
}

// ─── Step 2: Groq categorisation in batches of 25 ────────────────────────────
const GROQ_BATCH = 25
const groqBatches = []
for (let i = 0; i < products.length; i += GROQ_BATCH) {
  groqBatches.push(products.slice(i, i + GROQ_BATCH))
}
const totalGroqBatches = groqBatches.length

console.log(`\n🤖 Calling Groq in ${totalGroqBatches} batches of ${GROQ_BATCH}...`)

const allAssignments = []

for (let b = 0; b < groqBatches.length; b++) {
  const batch    = groqBatches[b]
  const batchNum = b + 1

  process.stdout.write(`   Groq batch ${batchNum}/${totalGroqBatches} — ${batch.length} products... `)

  const userPrompt = `Assign a category and realistic USD retail price to each product.
Categories must be EXACTLY one of (copy the name verbatim):
${CATEGORIES.join(', ')}

Mapping guide:
- Moisturisers, cleansers, toners, treatments, masks → Skincare
- Serums, actives, essences, ampoules → Serums & Actives
- Face wash, body wash, deodorant, dental, feminine care → Personal Care
- SPF, sunscreen, sunblock → Sun Care
- Body lotion, body oil, hair shampoo, conditioner → Body & Hair
- Facial devices, LED tools, rollers, brushes → Pro Tools
- Foundation, mascara, lipstick, eyeshadow, blush → Cosmetics

Rules:
- Price must be realistic USD retail (e.g. CeraVe $18, La Roche-Posay $35, Fenty Beauty $42, FOREO $199)
- list_price = retail price
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
${JSON.stringify(batch.map(p => ({
  id:    p.id,
  name:  p.fields.name  ?? '',
  brand: p.fields.brand ?? '',
})), null, 2)}`

  // Call Groq with retry on 429 rate-limit
  let groqData
  let attempt = 0
  while (true) {
    attempt++
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens:  4000,
      }),
    })

    if (res.status === 429) {
      // Respect retry-after header, default 65s to clear TPM window
      const retryAfter = parseInt(res.headers.get('retry-after') ?? '65', 10)
      const waitSec    = Math.max(retryAfter, 65)
      console.log(`\n   ⏳ Rate limited (attempt ${attempt}) — waiting ${waitSec}s for TPM reset...`)
      await new Promise(r => setTimeout(r, waitSec * 1000))
      continue
    }

    if (!res.ok) {
      const body = await res.text()
      console.error(`\n❌ Groq batch ${batchNum} failed (${res.status}):`, body.slice(0, 200))
      process.exit(1)
    }

    groqData = await res.json()
    break
  }

  const rawContent = groqData.choices?.[0]?.message?.content ?? ''

  // Parse JSON from Groq response
  let parsed = []
  try {
    parsed = JSON.parse(rawContent)
  } catch {
    try {
      const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      try {
        const match = rawContent.match(/\[[\s\S]*?\](?=\s*$)/m) ?? rawContent.match(/\[[\s\S]*\]/)
        if (!match) throw new Error('No JSON array found')
        parsed = JSON.parse(match[0])
      } catch (e) {
        console.error(`\n❌ Batch ${batchNum} parse failed:`, e.message)
        console.error('Raw (first 300):', rawContent.slice(0, 300))
        process.exit(1)
      }
    }
  }

  if (!Array.isArray(parsed)) {
    console.error(`\n❌ Batch ${batchNum}: response is not an array`)
    process.exit(1)
  }

  allAssignments.push(...parsed)
  console.log(`✓ ${parsed.length} categorised`)

  // Wait 1000ms between batches (rate limit safety)
  if (b < groqBatches.length - 1) {
    await new Promise(r => setTimeout(r, 1000))
  }
}

console.log(`\n✅ Groq complete — ${allAssignments.length} total assignments`)

// Validate
const valid = allAssignments.filter(a =>
  a.id &&
  typeof a.category === 'string' &&
  CATEGORIES.includes(a.category) &&
  typeof a.list_price  === 'number' &&
  typeof a.final_price === 'number'
)
const invalid = allAssignments.length - valid.length
if (invalid > 0) console.warn(`⚠️  Skipping ${invalid} assignments with invalid/missing fields`)

// ─── Step 3: Batch PATCH to Airtable (10 per batch, 250ms delay) ─────────────
console.log(`\n📝 Writing ${valid.length} records to Airtable in batches of 10...`)

const AT_BATCH = 10
let updated = 0

for (let i = 0; i < valid.length; i += AT_BATCH) {
  const batch     = valid.slice(i, i + AT_BATCH)
  const batchNum  = Math.floor(i / AT_BATCH) + 1
  const totalBatches = Math.ceil(valid.length / AT_BATCH)

  const patchRes = await fetch(`${AT_BASE}/Products`, {
    method:  'PATCH',
    headers: AT_HEADERS,
    body:    JSON.stringify({
      records: batch.map(a => ({
        id:     a.id,
        fields: {
          category:   a.category,
          list_price: Math.round(a.list_price * 100) / 100,
        },
      })),
    }),
  })

  if (!patchRes.ok) {
    const body = await patchRes.text()
    console.error(`❌ AT batch ${batchNum}/${totalBatches} failed (${patchRes.status}):`, body.slice(0, 200))
  } else {
    updated += batch.length
    process.stdout.write(`   AT batch ${batchNum}/${totalBatches} ✓\r`)
  }

  await new Promise(r => setTimeout(r, 250))
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n\n✅ Updated ${updated} products with categories and prices`)

const catCount = {}
for (const a of valid) {
  catCount[a.category] = (catCount[a.category] ?? 0) + 1
}

console.log('\n📊 Category breakdown:')
Object.entries(catCount)
  .sort(([, a], [, b]) => b - a)
  .forEach(([cat, count]) => {
    const bar = '█'.repeat(Math.round(count / valid.length * 20))
    console.log(`   ${cat.padEnd(18)} ${String(count).padStart(3)}  ${bar}`)
  })

console.log('\n🔍 Sample (first 5):')
valid.slice(0, 5).forEach(a => {
  const product = products.find(p => p.id === a.id)
  const name    = (product?.fields?.name ?? a.id).slice(0, 38).padEnd(38)
  console.log(`   ${name}  ${a.category.padEnd(16)}  $${a.list_price.toFixed(2)} → $${a.final_price.toFixed(2)}`)
})
