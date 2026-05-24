import { NextRequest, NextResponse } from 'next/server'
import { generateContent } from '@/lib/gemini'

export const dynamic = 'force-dynamic'

const cache = new Map<string, string>()

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name      = searchParams.get('name') ?? ''
  const brand     = searchParams.get('brand') ?? ''
  const category  = searchParams.get('category') ?? ''
  const pack_size = searchParams.get('pack_size') ?? ''
  const existing  = searchParams.get('existing') ?? ''

  if (!name) return NextResponse.json({ description: '', ai: false })

  if (existing && existing.length >= 50) {
    return NextResponse.json({ description: existing, ai: false })
  }

  const cacheKey = `${name}|${brand}|${pack_size}`
  if (cache.has(cacheKey)) {
    return NextResponse.json({ description: cache.get(cacheKey), ai: true })
  }

  try {
    const prompt = `Write a 3-sentence clinical product description for a healthcare procurement platform in Oman. Professional tone. No medical claims. Include pack size and intended use.

Product: ${name}
Brand: ${brand}
Category: ${category}
Pack Size: ${pack_size}

Return only the description text, no labels or headers.`

    const description = await generateContent(prompt, 0.4, 256)
    if (description) cache.set(cacheKey, description)
    return NextResponse.json({ description: description || existing || '', ai: !!description })
  } catch {
    return NextResponse.json({ description: existing || '', ai: false })
  }
}
