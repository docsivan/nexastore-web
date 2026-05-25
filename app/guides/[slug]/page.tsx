import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 3600

interface Content {
  content_id:       string
  title:            string
  meta_title:       string
  meta_description: string
  category:         string
  body:             string
  faq_schema:       string
  keywords:         string
  word_count:       number
}

async function fetchContent(slug: string): Promise<Content | null> {
  const base = process.env.AIRTABLE_BASE_ID
  const key  = process.env.AIRTABLE_API_KEY
  if (!base || !key) return null
  try {
    const f   = encodeURIComponent(`AND({content_id}='${slug}',{status}='published')`)
    const res = await fetch(
      `https://api.airtable.com/v0/${base}/Haya_Content?filterByFormula=${f}&maxRecords=1`,
      { headers: { Authorization: `Bearer ${key}` }, next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.records?.[0]?.fields || null
  } catch {
    return null
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const c = await fetchContent(slug)
  if (!c) return { title: 'Guide | NexaStore' }
  return {
    title:       c.meta_title || c.title,
    description: c.meta_description,
    keywords:    c.keywords,
  }
}

function renderMarkdown(text: string): string {
  const escaped = text
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold text-white mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-[#2A2A2A]">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="text-[#B0B0B0] mb-2 ml-4 list-disc">$1</li>')
    .split('\n')
    .map((line) => {
      if (line.startsWith('<h') || line.startsWith('<li') || line.trim() === '') return line
      return `<p class="text-[#B0B0B0] leading-relaxed mb-4">${line}</p>`
    })
    .join('\n')
  return escaped
}

export default async function GuidePage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const c = await fetchContent(slug)
  if (!c) notFound()

  return (
    <>
      {c.faq_schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: c.faq_schema }}
        />
      )}
      <main className="min-h-screen bg-[#0D0D0D] text-white">
        {/* Breadcrumb */}
        <div className="border-b border-[#2A2A2A] px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-2 text-sm text-[#555]">
            <Link href="/" className="hover:text-[#F5A623] transition-colors">Home</Link>
            <span>/</span>
            <Link href="/guides" className="hover:text-[#F5A623] transition-colors">Guides</Link>
            <span>/</span>
            <span className="text-[#A0A0A0] truncate max-w-xs">{c.title}</span>
          </div>
        </div>

        {/* Header */}
        <header className="border-b border-[#2A2A2A] bg-[#111] py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <span className="inline-block text-xs font-semibold text-[#F5A623] bg-[#F5A62315] px-3 py-1 rounded-full mb-4">
              {c.category}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              {c.title}
            </h1>
            {c.meta_description && (
              <p className="text-[#A0A0A0] text-lg leading-relaxed max-w-2xl">
                {c.meta_description}
              </p>
            )}
            {c.word_count && (
              <p className="text-[#555] text-sm mt-4">
                {c.word_count} words · {Math.ceil(c.word_count / 200)} min read
              </p>
            )}
          </div>
        </header>

        {/* Body */}
        <article className="max-w-4xl mx-auto px-4 py-12">
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(c.body || '') }} />
        </article>

        {/* CTA */}
        <section className="border-t border-[#2A2A2A] bg-[#111] py-10 px-4">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-semibold text-lg mb-1">
                Browse {c.category} Products
              </h3>
              <p className="text-[#A0A0A0] text-sm">
                Shop our full {c.category.toLowerCase()} range.
              </p>
            </div>
            <Link
              href={`/?category=${encodeURIComponent(c.category)}`}
              className="bg-[#F5A623] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#E09000] transition-colors text-sm flex-shrink-0"
            >
              Shop {c.category} →
            </Link>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/guides" className="text-[#F5A623] text-sm hover:underline">
            ← Back to all guides
          </Link>
        </div>
      </main>
    </>
  )
}
