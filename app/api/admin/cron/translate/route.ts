import { NextResponse } from 'next/server'
import { generateContent } from '@/lib/gemini'
import { getProducts, updateProductsBatch, writeCronLog } from '@/lib/supabase'

export const dynamic    = 'force-dynamic'
export const maxDuration = 300

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
  const records = await getProducts()
  return records
    // Skip products that already have an Arabic name
    .filter((r) => !r.nameAr)
    .map((r) => ({
      id:        r.id,
      name:      String(r.name ?? ''),
      category:  String(r.category ?? ''),
      brand:     String(r.brand ?? ''),
      pack_size: String(r.pack_size ?? ''),
    }))
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
  const batch = translations
    .filter(t => t.nameAr)
    .map(t => ({
      id:     t.id,
      // productFieldsToColumns maps these to name_ar / category_ar / description_ar
      nameAr:        t.nameAr,
      categoryAr:    t.categoryAr,
      descriptionAr: t.descriptionAr,
    }))

  if (batch.length === 0) return 0
  const res = await updateProductsBatch(batch)
  return res.updated
}

export async function GET() {
  try {
    const products = await fetchUntranslated()

    if (products.length === 0) {
      await writeCronLog({ cron_name: 'translate_arabic', status: 'success', records_processed: 0 })
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

    await writeCronLog({ cron_name: 'translate_arabic', status: 'success', records_processed: totalProcessed })
    return NextResponse.json({
      ok:       true,
      processed: totalProcessed,
      message:  `Translated ${totalProcessed} of ${products.length} products to Arabic`,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await writeCronLog({ cron_name: 'translate_arabic', status: 'failed', records_processed: 0, error_message: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
