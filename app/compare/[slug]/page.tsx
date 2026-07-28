import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getContentBySlug } from '@/lib/content-helpers'

export const revalidate = 3600

interface Content {
  content_id:       string
  title:            string
  meta_title:       string
  meta_description: string
  category:         string
  body:             string
  faq_schema:       string
  word_count:       number
}

async function fetchContent(slug: string): Promise<Content | null> {
  try {
    const record = await getContentBySlug(slug)
    if (!record || record.status !== 'published' || record.content_tier !== 'comparison') {
      return null
    }
    return record as unknown as Content
  } catch {
    return null
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const c = await fetchContent(slug)
  if (!c) return { title: 'Comparison | NexaStore' }
  return {
    title:       c.meta_title || c.title,
    description: c.meta_description,
  }
}

function renderMarkdown(text: string): string {
  return text
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-[#2A2A2A]">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="text-[#B0B0B0] mb-2 ml-4 list-disc">$1</li>')
    .split('\n')
    .map((line) => {
      if (line.startsWith('<h') || line.startsWith('<li') || line.trim() === '') return line
      return `<p class="text-[#B0B0B0] leading-relaxed mb-4">${line}</p>`
    })
    .join('\n')
}

export default async function ComparePage(
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
            <span className="text-[#A0A0A0]">Compare</span>
          </div>
        </div>

        {/* Header */}
        <header className="border-b border-[#2A2A2A] bg-[#111] py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <span className="inline-block text-xs font-semibold text-[#5DADE2] bg-[#5DADE215] px-3 py-1 rounded-full mb-4">
              vs Comparison
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              {c.title}
            </h1>
            {c.meta_description && (
              <p className="text-[#A0A0A0] text-lg leading-relaxed max-w-2xl">
                {c.meta_description}
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
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <Link
              href="/guides"
              className="border border-[#2A2A2A] text-white px-5 py-2.5 rounded-lg hover:border-[#F5A623] hover:text-[#F5A623] transition-all text-sm"
            >
              ← More guides
            </Link>
            <Link
              href={`/?category=${encodeURIComponent(c.category)}`}
              className="bg-[#F5A623] text-black font-semibold px-5 py-2.5 rounded-lg hover:bg-[#E09000] transition-colors text-sm"
            >
              Shop {c.category} →
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
