import { NextRequest, NextResponse } from 'next/server'
import { callSonnet } from '@/lib/claude'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

const BATCH_SIZE = 25

function checkAuth(req: NextRequest): boolean {
  const cronSecret = req.headers.get('x-cron-secret')
  const adminPin   = req.headers.get('x-admin-pin')
  return cronSecret === process.env.CRON_SECRET || !!adminPin
}

interface Product {
  id:          string
  item_code:   string
  name:        string
  description: string
  category:    string
}

async function getUntranslatedProducts(): Promise<Product[]> {
  // Fetch products that don't yet have an Arabic SEO record
  const [productsRes, seoRes] = await Promise.all([
    fetch(
      `${AT_BASE}/Products?fields[]=item_code&fields[]=name&fields[]=description&fields[]=category&fields[]=is_active&filterByFormula=${encodeURIComponent('{is_active}=1')}&maxRecords=100`,
      { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
    ),
    fetch(
      `${AT_BASE}/Nexa_SEO?fields[]=item_code&fields[]=meta_title_ar&filterByFormula=${encodeURIComponent('NOT({meta_title_ar}="")')}&maxRecords=200`,
      { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
    ),
  ])

  const productsData = productsRes.ok ? await productsRes.json() : { records: [] }
  const seoData      = seoRes.ok     ? await seoRes.json()      : { records: [] }

  const translatedCodes = new Set(
    (seoData.records ?? []).map((r: { fields: Record<string, unknown> }) => String(r.fields.item_code ?? ''))
  )

  const all: Product[] = (productsData.records ?? []).map((r: { id: string; fields: Record<string, unknown> }) => ({
    id:          r.id,
    item_code:   String(r.fields.item_code   ?? ''),
    name:        String(r.fields.name        ?? ''),
    description: String(r.fields.description ?? ''),
    category:    String(r.fields.category    ?? ''),
  })).filter((p: Product) => p.item_code && !translatedCodes.has(p.item_code))

  return all.slice(0, BATCH_SIZE)
}

interface Translation {
  item_code:         string
  meta_title_ar:     string
  meta_description_ar: string
}

async function translateBatch(products: Product[]): Promise<Translation[]> {
  const systemPrompt = `You are a professional Arabic medical translator for NexaStore, a global commerce platform.
Translate product metadata to Modern Standard Arabic (MSA) suitable for Gulf Arabic markets.
Return ONLY a valid JSON array with no markdown, no code fences.
Each element: { "item_code": string, "meta_title_ar": string (max 60 chars in Arabic), "meta_description_ar": string (120-155 chars in Arabic) }`

  const userPrompt = `Translate these medical supply products to Arabic meta tags for SEO:
${products.map(p => `- item_code: ${p.item_code} | name: ${p.name} | category: ${p.category} | description: ${p.description.slice(0, 150)}`).join('\n')}

For meta_title_ar: include the product name + "عُمان" or "مسقط" if space allows.
For meta_description_ar: include key benefits + "هيات سبلايز" brand mention.`

  const raw     = await callSonnet(userPrompt, systemPrompt)
  const cleaned = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(cleaned)
}

async function upsertSeoRecord(translation: Translation): Promise<void> {
  const formula    = encodeURIComponent(`{item_code}="${translation.item_code}"`)
  const checkRes   = await fetch(
    `${AT_BASE}/Nexa_SEO?filterByFormula=${formula}&maxRecords=1`,
    { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
  )
  const checkData  = checkRes.ok ? await checkRes.json() : { records: [] }
  const existing   = checkData.records?.[0]

  const fields = {
    meta_title_ar:       translation.meta_title_ar,
    meta_description_ar: translation.meta_description_ar,
  }

  if (existing) {
    await fetch(`${AT_BASE}/Nexa_SEO/${existing.id}`, {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ fields }),
    })
  } else {
    await fetch(`${AT_BASE}/Nexa_SEO`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ records: [{ fields: { item_code: translation.item_code, ...fields } }] }),
    })
  }
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!API_KEY || !BASE_ID) return NextResponse.json({ error: 'Airtable not configured' }, { status: 500 })

  try {
    const products = await getUntranslatedProducts()
    if (products.length === 0) {
      return NextResponse.json({ ok: true, message: 'All active products already have Arabic meta tags', translated: 0 })
    }

    let translations: Translation[] = []
    try {
      translations = await translateBatch(products)
    } catch (e) {
      return NextResponse.json({ error: `Translation failed: ${String(e)}` }, { status: 500 })
    }

    let saved = 0
    for (const t of translations) {
      if (t.item_code && t.meta_title_ar) {
        await upsertSeoRecord(t)
        saved++
      }
    }

    return NextResponse.json({
      ok:         true,
      products:   products.length,
      translated: saved,
      remaining:  Math.max(0, products.length - saved),
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[translate]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
