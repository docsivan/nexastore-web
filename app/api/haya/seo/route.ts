import { NextRequest, NextResponse } from 'next/server'
import { callSonnet } from '@/lib/claude'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

async function getRelatedGuides(category: string): Promise<Array<{ title: string; slug: string; tier: string }>> {
  if (!API_KEY || !BASE_ID || !category) return []
  try {
    const formula = encodeURIComponent(`AND({status}="published",{category}="${category}")`)
    const res     = await fetch(
      `${AT_BASE}/Haya_Content?filterByFormula=${formula}&maxRecords=4`,
      { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.records ?? []).map((r: { fields: Record<string, unknown> }) => ({
      title: String(r.fields.title       ?? ''),
      slug:  String(r.fields.content_id  ?? ''),
      tier:  String(r.fields.content_tier ?? ''),
    }))
  } catch { return [] }
}

async function generateSchemaJson(name: string, brand: string, category: string, item_code: string): Promise<string> {
  const MEDICAL_TYPES = ['medical devices', 'sterilization', 'diagnostics']
  const isMedical     = MEDICAL_TYPES.some(t => category.toLowerCase().includes(t))
  const schemaType    = isMedical ? 'MedicalDevice' : 'Product'
  const siteDomain    = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'hayatsupplies.com'

  const systemPrompt = `You are a schema.org JSON-LD expert for medical/healthcare e-commerce.
Generate a valid JSON-LD schema for a healthcare product. Return ONLY the raw JSON object, no markdown fences.`

  const userPrompt = `Generate a schema.org/${schemaType} JSON-LD for:
Name: ${name}
Brand: ${brand || 'Hayat Supplies'}
Category: ${category}
SKU: ${item_code}
URL: https://${siteDomain}/products/${item_code}
Currency: OMR
Seller: Hayat Supplies (Oman)
Include @context, @type, name, description, sku/identifier, brand, offers (with price placeholder "0.000", priceCurrency OMR, availability InStock).`

  const raw = await callSonnet(userPrompt, systemPrompt)
  return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
}

async function patchHayaSEO(item_code: string, schema_json: string) {
  if (!API_KEY || !BASE_ID || !item_code) return
  try {
    const formula   = encodeURIComponent(`{item_code}="${item_code}"`)
    const checkRes  = await fetch(`${AT_BASE}/Haya_SEO?filterByFormula=${formula}&maxRecords=1`, {
      headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store',
    })
    const checkData = await checkRes.json()
    const existing  = checkData.records?.[0]

    if (existing) {
      await fetch(`${AT_BASE}/Haya_SEO/${existing.id}`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fields: { schema_json } }),
      })
    } else {
      await fetch(`${AT_BASE}/Haya_SEO`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fields: { item_code, schema_json } }),
      })
    }
  } catch {}
}

export async function POST(req: NextRequest) {
  try {
    const { name, brand, category, pack_size, item_code } = await req.json()
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const [description, internalLinks, schemaJson] = await Promise.all([
      callSonnet(
        `Product: ${name}\nBrand: ${brand ?? 'N/A'}\nCategory: ${category ?? 'N/A'}\nPack size: ${pack_size ?? 'N/A'}`,
        'You are a medical supplies copywriter for Hayat Supplies, Oman. Write a 2-sentence product description (max 100 words) that is professional, accurate, and SEO-optimised for healthcare procurement. Focus on clinical use, material quality, and pack efficiency. No marketing fluff. No price mentions.'
      ),
      getRelatedGuides(category ?? ''),
      item_code ? generateSchemaJson(name, brand ?? '', category ?? '', item_code) : Promise.resolve(''),
    ])

    if (item_code && schemaJson) {
      patchHayaSEO(item_code, schemaJson).catch(() => {})
    }

    return NextResponse.json({
      description:    description.trim(),
      internal_links: internalLinks,
      schema_json:    schemaJson || undefined,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
