import { NextRequest, NextResponse } from 'next/server'
import { atList, atCreate, atPatch } from '@/lib/ai-tables'
import { callSonnet } from '@/lib/claude'
import { getStoreContext } from '@/lib/ai-context'

export const dynamic = 'force-dynamic'


const BATCH_SIZE = 25

function checkAuth(req: NextRequest): boolean {
  const cronSecret = req.headers.get('x-cron-secret')
  return cronSecret === process.env.CRON_SECRET || req.cookies.get('adminAuth')?.value === 'true'
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
  const [productsData, seoData] = await Promise.all([
    atList('Products', { limit: 100, match: { is_active: true } }),
    atList('Nexa_SEO', { limit: 200 }),
  ])

  // Only rows that already carry an Arabic title count as translated
  const translatedCodes = new Set(
    (seoData.records ?? [])
      .filter((r: { fields: Record<string, unknown> }) => Boolean(r.fields.meta_title_ar))
      .map((r: { fields: Record<string, unknown> }) => String(r.fields.item_code ?? ''))
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
  const storeCtx    = await getStoreContext()
  const systemPrompt = `You are a professional Arabic translator for ${storeCtx.storeName}, a global commerce platform.
Translate product metadata to Modern Standard Arabic (MSA).
Return ONLY a valid JSON array with no markdown, no code fences.
Each element: { "item_code": string, "meta_title_ar": string (max 60 chars in Arabic), "meta_description_ar": string (120-155 chars in Arabic) }`

  const userPrompt = `Translate these products to Arabic meta tags for SEO:
${products.map(p => `- item_code: ${p.item_code} | name: ${p.name} | category: ${p.category} | description: ${p.description.slice(0, 150)}`).join('\n')}

For meta_title_ar: include the product name in Arabic (max 60 chars).
For meta_description_ar: include key benefits and ${storeCtx.storeName} brand mention (120-155 chars).`

  const raw     = await callSonnet(userPrompt, systemPrompt)
  const cleaned = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(cleaned)
}

async function upsertSeoRecord(translation: Translation): Promise<void> {
  const checkData = await atList('Nexa_SEO', {
    limit: 1,
    match: { item_code: translation.item_code },
  })
  const existing = checkData.records?.[0]

  const fields = {
    meta_title_ar:       translation.meta_title_ar,
    meta_description_ar: translation.meta_description_ar,
  }

  if (existing) {
    await atPatch('Nexa_SEO', existing.id, fields)
  } else {
    await atCreate('Nexa_SEO', { item_code: translation.item_code, ...fields })
  }
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
