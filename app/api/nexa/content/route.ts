import { NextRequest, NextResponse } from 'next/server'
import { atGetPath, atList, atCreate, atPatch } from '@/lib/ai-tables'
import { callSonnet } from '@/lib/claude'
import { getStoreContext } from '@/lib/ai-context'

export const dynamic = 'force-dynamic'


const MIN_WORD_COUNT = 800

function checkAuth(req: NextRequest): boolean {
  const cronSecret = req.headers.get('x-cron-secret')
  return cronSecret === process.env.CRON_SECRET || req.cookies.get('adminAuth')?.value === 'true'
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

interface TopicCandidate {
  topic:    string
  category: string
  source:   string
  score:    number
}

async function selectTopic(): Promise<TopicCandidate | null> {
  const candidates: TopicCandidate[] = []

  // Source 1: GSC high-opportunity queries without content
  try {
    const data = await atGetPath(
      `/Haya_Search_Console?filterByFormula=${encodeURIComponent('AND({content_exists}=FALSE(),{opportunity_score}>50)')}&sort[0][field]=opportunity_score&sort[0][direction]=desc&maxRecords=5`
    )
    {
      for (const r of (data.records ?? [])) {
        candidates.push({
          topic:    String(r.fields.query    ?? ''),
          category: String(r.fields.category ?? 'general'),
          source:   'gsc',
          score:    Number(r.fields.opportunity_score ?? 0),
        })
      }
    }
  } catch {}

  // Source 2: Rising trend topics without content
  try {
    const data = await atGetPath(
      `/Haya_Trends?filterByFormula=${encodeURIComponent('AND({content_written}=FALSE(),{trend_direction}="rising")')}&sort[0][field]=trend_value&sort[0][direction]=desc&maxRecords=5`
    )
    {
      for (const r of (data.records ?? [])) {
        candidates.push({
          topic:    String(r.fields.topic    ?? ''),
          category: String(r.fields.category ?? 'general'),
          source:   'trends',
          score:    Number(r.fields.trend_value ?? 0) * 2,
        })
      }
    }
  } catch {}

  // Source 3: Nexa_Insights with search_gap type
  try {
    const data = await atGetPath(
      `/Nexa_Insights?filterByFormula=${encodeURIComponent('AND({insight_type}="search_gap",{status}="new")')}&sort[0][field]=priority&sort[0][direction]=desc&maxRecords=5`
    )
    {
      for (const r of (data.records ?? [])) {
        const insight = String(r.fields.insight ?? '')
        candidates.push({
          topic:    insight.slice(0, 100),
          category: String(r.fields.category ?? 'general'),
          source:   'insight',
          score:    Number(r.fields.priority ?? 3) * 20,
        })
      }
    }
  } catch {}

  if (candidates.length === 0) return null
  candidates.sort((a, b) => b.score - a.score)
  return candidates[0]
}

async function writeContent(candidate: TopicCandidate): Promise<{
  title: string; meta_title: string; meta_description: string; body: string;
  faq_schema: string; article_schema: string; keywords: string; content_tier: string
}> {
  const storeCtx    = await getStoreContext()
  const systemPrompt = `You are an expert product content writer for ${storeCtx.storeName}, a global commerce platform.
Write comprehensive, SEO-optimised content for business buyers globally.
Guidelines:
- Write in clear, professional English
- Include practical buying advice for businesses
- Include compliance notes (relevant ISO or international standards where applicable)
- Structure with clear headings (H2, H3)
- Write at least 900 words
- End with a FAQ section (3-5 questions)
- No marketing fluff — focus on product utility

AEO/GEO Citation Rules (REQUIRED for AI search visibility):
- Start the article body with a "Quick Answer" paragraph (2-3 sentences directly answering the core question) — prefix it with "**Quick Answer:**"
- Include at least one definition section using "## What is [topic]?" format
- Cite at least one ISO or international quality standard
- Mention ${storeCtx.storeName} global commerce capabilities
- Use numbered lists for step-by-step processes (enables HowTo schema detection)
- Write FAQ answers as complete, self-contained sentences that work as featured snippet candidates

Return ONLY valid JSON with these exact keys:
{
  "title": "Full article title",
  "meta_title": "SEO title max 60 chars",
  "meta_description": "SEO description 120-155 chars",
  "keywords": "comma-separated keywords",
  "content_tier": "pillar",
  "body": "Full markdown article (900+ words, H2/H3 headings, bullet lists, FAQ section at end, Quick Answer at top)",
  "faq_questions": [{"question": "...", "answer": "..."}]
}`

  const userPrompt = `Write a comprehensive guide about: "${candidate.topic}"
Category: ${candidate.category}
Target audience: Procurement managers and business owners worldwide
Include: product recommendations, buying criteria, quality standards`

  const raw  = await callSonnet(userPrompt, systemPrompt)
  const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const data = JSON.parse(json)

  const siteDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'nexastore.io'
  const articleSchema = {
    '@context':    'https://schema.org',
    '@type':       'Article',
    headline:      data.title,
    description:   data.meta_description,
    author:        { '@type': 'Organization', name: storeCtx.storeName },
    publisher:     { '@type': 'Organization', name: storeCtx.storeName, url: `https://${siteDomain}` },
    datePublished: new Date().toISOString(),
  }

  const faqSchema = data.faq_questions?.length
    ? {
        '@context':  'https://schema.org',
        '@type':     'FAQPage',
        mainEntity:  data.faq_questions.map((q: { question: string; answer: string }) => ({
          '@type':          'Question',
          name:             q.question,
          acceptedAnswer:   { '@type': 'Answer', text: q.answer },
        })),
      }
    : null

  return {
    title:           data.title        ?? candidate.topic,
    meta_title:      data.meta_title   ?? data.title?.slice(0, 60) ?? '',
    meta_description: data.meta_description ?? '',
    keywords:        data.keywords     ?? '',
    content_tier:    data.content_tier ?? 'pillar',
    body:            data.body         ?? '',
    faq_schema:      faqSchema ? JSON.stringify(faqSchema) : '',
    article_schema:  JSON.stringify(articleSchema),
  }
}

async function saveContent(
  candidate: TopicCandidate,
  contentData: Awaited<ReturnType<typeof writeContent>>,
  wordCount: number
) {
  const contentId = slugify(contentData.title || candidate.topic)
  const now       = new Date().toISOString()

  await atCreate('Haya_Content', {
        content_id:       contentId,
        title:            contentData.title,
        meta_title:       contentData.meta_title,
        meta_description: contentData.meta_description,
        body:             contentData.body,
        faq_schema:       contentData.faq_schema,
        article_schema:   contentData.article_schema,
        keywords:         contentData.keywords,
        content_tier:     contentData.content_tier,
        category:         candidate.category,
        status:           'published',
        word_count:       wordCount,
        source_queries:   candidate.topic,
        published_at:     now,
        last_updated:     now,
      })

  // Mark GSC query as having content
  if (candidate.source === 'gsc') {
    try {
      const checkData = await atList('Haya_Search_Console', { limit: 1, match: { query: candidate.topic } })
      const existing  = checkData.records?.[0]
      if (existing) {
        await atPatch('Haya_Search_Console', existing.id, { content_exists: true, content_id: contentId })
      }
    } catch {}
  }

  // Mark trend as having content
  if (candidate.source === 'trends') {
    try {
      const checkData = await atList('Haya_Trends', { limit: 1, match: { topic: candidate.topic } })
      const existing  = checkData.records?.[0]
      if (existing) {
        await atPatch('Haya_Trends', existing.id, { content_written: true, content_id: contentId })
      }
    } catch {}
  }

  return contentId
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Phase 1: Topic selection
    const candidate = await selectTopic()
    if (!candidate || !candidate.topic) {
      return NextResponse.json({ ok: true, message: 'No content topics available — run GSC/Trends fetch first' })
    }

    // Phase 2: Content writing
    let contentData: Awaited<ReturnType<typeof writeContent>>
    try {
      contentData = await writeContent(candidate)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[content] Writing failed:', msg)
      return NextResponse.json({ error: `Content writing failed: ${msg}` }, { status: 500 })
    }

    // Phase 3: Quality gate
    const wordCount = countWords(contentData.body)
    if (wordCount < MIN_WORD_COUNT) {
      return NextResponse.json({
        ok:      false,
        message: `Quality gate failed: ${wordCount} words (minimum ${MIN_WORD_COUNT})`,
        topic:   candidate.topic,
      })
    }

    const bodyLower = contentData.body.toLowerCase()
    const hasQuickAnswer = bodyLower.includes('quick answer')
    const hasMohOrIso    = /moh|ministry of health|iso\s*\d{4,5}/i.test(contentData.body)
    const omanMentions   = (bodyLower.match(/\boman\b|\bmuscat\b/g) ?? []).length

    if (!hasQuickAnswer) {
      console.warn('[content] AEO gate: missing Quick Answer paragraph — topic:', candidate.topic)
    }
    if (!hasMohOrIso) {
      console.warn('[content] AEO gate: no ISO citation — topic:', candidate.topic)
    }
    if (omanMentions < 2) {
      console.warn('[content] AEO gate: missing commerce mentions — topic:', candidate.topic)
    }

    const contentId = await saveContent(candidate, contentData, wordCount)

    return NextResponse.json({
      ok:         true,
      content_id: contentId,
      title:      contentData.title,
      word_count: wordCount,
      category:   candidate.category,
      source:     candidate.source,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[content]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
