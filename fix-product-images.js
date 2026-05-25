const fs = require('fs')
const path = require('path')

// Load env vars from .env.local
const envPath = path.join(__dirname, '.env.local')
const envVars = {}
fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) envVars[key.trim()] = rest.join('=').trim()
})

const AIRTABLE_API_KEY = envVars.AIRTABLE_API_KEY
const BASE_ID = 'appaVFVbwG9MkoDa9'
const TABLE_NAME = 'Products'

const IMAGE_MAP = {
  Moisturisers: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80',
  Serums: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80',
  Cleansers: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80',
  Sunscreen: 'https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=400&q=80',
  default: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&q=80',
}

const AIRTABLE_BASE = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`
const HEADERS = {
  Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
}

async function fetchAllRecords() {
  const records = []
  let offset = null
  do {
    const url = offset ? `${AIRTABLE_BASE}?offset=${offset}` : AIRTABLE_BASE
    const res = await fetch(url, { headers: HEADERS })
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${await res.text()}`)
    const data = await res.json()
    records.push(...data.records)
    offset = data.offset
    if (offset) await sleep(250) // rate-limit between pages
  } while (offset)
  return records
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function chunk(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

async function patchBatch(records) {
  const res = await fetch(AIRTABLE_BASE, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({ records }),
  })
  if (!res.ok) throw new Error(`Patch failed: ${res.status} ${await res.text()}`)
  return res.json()
}

;(async () => {
  console.log('Fetching all records from Airtable...')
  const records = await fetchAllRecords()
  console.log(`Fetched ${records.length} records.`)

  const updates = records.map((r) => {
    const category = r.fields.category || r.fields.Category || ''
    const imageUrl = IMAGE_MAP[category] || IMAGE_MAP.default
    return { id: r.id, fields: { image_url: imageUrl } }
  })

  const batches = chunk(updates, 10)
  console.log(`Sending ${batches.length} PATCH batches (10 records each, max 5 req/s)...`)

  let updated = 0
  for (let i = 0; i < batches.length; i++) {
    await patchBatch(batches[i])
    updated += batches[i].length
    process.stdout.write(`\r  Updated ${updated}/${updates.length} records...`)
    // 5 req/s → 200ms between requests; add small buffer
    if (i < batches.length - 1) await sleep(250)
  }

  console.log(`\nDone. ${updated} records updated successfully.`)
})()
