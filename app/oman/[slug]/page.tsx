import { notFound }  from 'next/navigation'
import type { Metadata } from 'next'
import Link            from 'next/link'
import { getContentBySlug } from '@/lib/content-helpers'
import { adaptAirtableProducts } from '@/lib/adapters'
import { generateLocalBusinessSchema, generateBreadcrumb } from '@/lib/schema'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.AIRTABLE_API_KEY
const BASE_ID = process.env.AIRTABLE_BASE_ID
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const content = await getContentBySlug(params.slug)
  if (!content || content.content_tier !== 'local') return { title: 'Page Not Found' }
  return {
    title:       content.meta_title || `${content.title} | Hayat Supplies`,
    description: content.meta_description,
    keywords:    content.keywords,
  }
}

async function getRelatedProducts(category: string) {
  if (!API_KEY || !BASE_ID) return []
  try {
    const formula = encodeURIComponent(`AND({category}="${category}",{is_active}=1)`)
    const res = await fetch(
      `${AT_BASE}/Products?filterByFormula=${formula}&maxRecords=4`,
      { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
    )
    if (!res.ok) return []
    const data = await res.json()
    return adaptAirtableProducts(data.records ?? [])
  } catch { return [] }
}

function renderMarkdownSimple(md: string): string {
  // Minimal markdown for SSR without importing a heavy library
  return md
    .replace(/^### (.+)$/gm, '<h3 class="font-heading font-semibold text-lg text-primary-dark mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-heading font-bold text-xl text-primary-dark mt-8 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="font-heading font-bold text-2xl text-primary-dark mt-8 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n\n/g, '</p><p class="font-body text-slate leading-relaxed mb-4">')
    .replace(/^(?!<[hlp])/gm, '')
}

export default async function OmanLocalPage({ params }: Props) {
  const content = await getContentBySlug(params.slug)
  if (!content || content.content_tier !== 'local') notFound()

  const [relatedProducts] = await Promise.all([
    getRelatedProducts(content.category),
  ])

  const categoryLabel = content.category
    ? content.category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Medical Supplies'

  const localBusinessJson = generateLocalBusinessSchema({
    title:    content.title,
    category: content.category,
    slug:     params.slug,
  })

  const breadcrumbJson = generateBreadcrumb([
    { name: 'Home',     url: '/' },
    { name: 'Oman',     url: '/oman' },
    { name: content.title, url: `/oman/${params.slug}` },
  ])

  // Simple body render — try using renderMarkdown from content-helpers if available
  let bodyHtml = ''
  try {
    const { renderMarkdown } = await import('@/lib/content-helpers')
    bodyHtml = renderMarkdown(content.body)
  } catch {
    bodyHtml = `<p class="font-body text-slate leading-relaxed mb-4">${renderMarkdownSimple(content.body)}</p>`
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: localBusinessJson }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJson }} />

      <div className="container-page py-10 pb-16">
        <nav className="text-xs font-body text-slate-muted mb-6 flex items-center gap-1.5">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link href="/oman" className="hover:text-primary transition-colors">Oman</Link>
          <span>/</span>
          <span className="text-slate line-clamp-1">{content.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <article className="lg:col-span-3">
            {content.category && (
              <span className="inline-block text-xs font-body font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize mb-4">
                {content.category.replace(/-/g, ' ')}
              </span>
            )}
            <h1 className="font-heading text-3xl font-bold text-primary-dark mb-3 leading-tight">{content.title}</h1>
            {content.meta_description && (
              <p className="font-body text-slate-muted text-base mb-6 leading-relaxed border-l-4 border-primary/30 pl-4">
                {content.meta_description}
              </p>
            )}

            <div
              className="prose-content font-body text-slate leading-relaxed"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />

            <div className="mt-10 bg-primary/5 border border-primary/20 rounded-xl p-6">
              <h3 className="font-heading font-semibold text-primary-dark mb-2">
                Ready to order {categoryLabel}?
              </h3>
              <p className="font-body text-sm text-slate-muted mb-4">
                Hayat Supplies delivers {categoryLabel.toLowerCase()} to clinics and hospitals across Oman. MOH compliant products, fast delivery to Muscat and beyond.
              </p>
              <Link
                href={content.category ? `/products?category=${content.category}` : '/products'}
                className="inline-block px-5 py-2.5 bg-primary text-white text-sm font-body font-semibold rounded-btn hover:bg-primary-dark transition-colors"
              >
                Browse {categoryLabel} Products →
              </Link>
            </div>
          </article>

          <aside className="lg:col-span-1 space-y-5">
            {relatedProducts.length > 0 && (
              <div className="bg-surface rounded-xl border border-border p-4 sticky top-24">
                <h4 className="font-heading font-semibold text-sm text-primary-dark mb-3">
                  {categoryLabel} Products
                </h4>
                <div className="flex flex-col gap-3">
                  {relatedProducts.map(p => (
                    <Link key={p.id} href={`/products/${p.id}`}
                      className="group flex items-start gap-2 py-1.5 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body text-slate group-hover:text-primary transition-colors truncate">{p.name}</p>
                        <p className="text-xs text-slate-muted mt-0.5">OMR {p.price.toFixed(3)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link href={`/products?category=${content.category}`}
                  className="block mt-3 text-xs font-body font-medium text-primary hover:underline">
                  View all →
                </Link>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  )
}
