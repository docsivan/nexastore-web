import { NextResponse } from 'next/server'
import { generateContent } from '@/lib/gemini'

export const dynamic    = 'force-dynamic'
export const maxDuration = 300

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`
const HEADERS = {
  Authorization:  `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
}

const BATCH_SIZE = 10
const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

interface ProductRow {
  id:        string
  name:      string
  category:  string
  brand:     string
  pack_size: string
}

interface Translation {
  id:           string
  nameAr:       string
  categoryAr:   string
  descriptionAr: string
}

async function fetchUntranslated(): Promise<ProductRow[]> {
  const records: ProductRow[] = []
  let offset: string | undefined

  do {
    const url = new URL(`${AT_BASE}/Products`)
    url.searchParams.set('filterByFormula', '{is_active}=1')
    url.searchParams.set('fields[]', 'name')
    url.searchParams.append('fields[]', 'category')
    url.searchParams.append('fields[]', 'brand')
    url.searchParams.append('fields[]', 'pack_size')
    url.searchParams.append('fields[]', 'nameAr')
    if (offset) url.searchParams.set('offset', offset)

    const res = await fetch(url.toString(), { headers: HEADERS, cache: 'no-store' })
    if (!res.ok) throw new Error(`Airtable list failed: ${res.status}`)
    const data = await res.json()

    for (const r of data.records ?? []) {
      // Skip records that already have Arabic name
      if (r.fields.nameAr) continue
      records.push({
        id:        r.id,
        name:      r.fields.name      ?? '',
        category:  r.fields.category  ?? '',
        brand:     r.fields.brand     ?? '',
        pack_size: r.fields.pack_size ?? '',
      })
    }

    offset = data.offset
    if (offset) await wait(200)
  } while (offset)

  return records
}

async function translateBatch(rows: ProductRow[]): Promise<Translation[]> {
  const productList = rows
    .map((r, i) =>
      `${i + 1}. name="${r.name}" | category="${r.category}" | brand="${r.brand}" | pack_size="${r.pack_size}"`
    )
    .join('\n')

  const prompt = `You are a medical supply product translator. Translate accurately to Modern Standard Arabic. Return JSON only: array of {nameAr, categoryAr, descriptionAr}.

Translate these ${rows.length} medical supply products to Arabic. Return a JSON array with one object per product in the same order as the input. Each object must have:
- nameAr: product name translated to Arabic
- categoryAr: category breadcrumb translated to Arabic
- descriptionAr: exactly 2 sentences in Arabic describing the product using its name, brand, and pack_size

Products:
${productList}

Return ONLY a valid JSON array. No markdown, no code fences, no explanation.`

  const raw     = await generateContent(prompt, 0.1, 4096)
  const cleaned = raw.replace(/```json|```/g, '').trim()

  // Extract JSON array from response robustly
  const match = cleaned.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('Gemini did not return a JSON array')
  const arr = JSON.parse(match[0])

  return rows.map((r, i) => ({
    id:            r.id,
    nameAr:        arr[i]?.nameAr        ?? '',
    categoryAr:    arr[i]?.categoryAr    ?? '',
    descriptionAr: arr[i]?.descriptionAr ?? '',
  }))
}

async function patchTranslations(translations: Translation[]): Promise<number> {
  const records = translations
    .filter(t => t.nameAr)
    .map(t => ({
      id:     t.id,
      fields: {
        nameAr:        t.nameAr,
        categoryAr:    t.categoryAr,
        descriptionAr: t.descriptionAr,
      },
    }))

  if (records.length === 0) return 0

  const res = await fetch(`${AT_BASE}/Products`, {
    method:  'PATCH',
    headers: HEADERS,
    body:    JSON.stringify({ records }),
  })
  if (!res.ok) throw new Error(`Airtable PATCH failed: ${res.status}`)
  return records.length
}

async function logCron(cron: string, count: number, status: 'success' | 'failed', error = '') {
  await fetch(`${AT_BASE}/Haya_Cron_Log`, {
    method:  'POST',
    headers: HEADERS,
    body: JSON.stringify({
      records: [{
        fields: {
          cron_name:         cron,
          status,
          records_processed: count,
          error_message:     error,
          run_at:            new Date().toISOString(),
        },
      }],
    }),
  }).catch(() => {})
}

export async function GET() {
  if (!API_KEY || !BASE_ID) {
    return NextResponse.json({ error: 'Airtable not configured' }, { status: 500 })
  }

  try {
    const products = await fetchUntranslated()

    if (products.length === 0) {
      await logCron('translate_arabic', 0, 'success')
      return NextResponse.json({
        ok:       true,
        processed: 0,
        message:  'All products already have Arabic translations',
      })
    }

    let totalProcessed = 0

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE)

      let translations: Translation[]
      try {
        translations = await translateBatch(batch)
      } catch (e) {
        console.error(`[translate] batch at offset ${i} failed:`, e)
        await wait(200)
        continue
      }

      await wait(200) // rate limit before PATCH
      const saved = await patchTranslations(translations)
      totalProcessed += saved

      if (i + BATCH_SIZE < products.length) await wait(200)
    }

    await logCron('translate_arabic', totalProcessed, 'success')
    return NextResponse.json({
      ok:       true,
      processed: totalProcessed,
      message:  `Translated ${totalProcessed} of ${products.length} products to Arabic`,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await logCron('translate_arabic', 0, 'failed', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
