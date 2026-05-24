import { notFound }    from 'next/navigation'
import type { Metadata } from 'next'
import Link              from 'next/link'
import { getContentBySlug, getPublishedByCategory, renderMarkdown } from '@/lib/content-helpers'
import { generateBreadcrumb, generateHowToSchema } from '@/lib/schema'

export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const content = await getContentBySlug(params.slug)
  if (!content || content.status !== 'published') return { title: 'Guide Not Found' }
  return {
    title:       content.meta_title || `${content.title} | Hayat Supplies`,
    description: content.meta_description,
    keywords:    content.keywords,
  }
}

export default async function GuidePage({ params }: Props) {
  const content = await getContentBySlug(params.slug)
  if (!content || content.status !== 'published') notFound()

  const related  = await getPublishedByCategory(content.category, params.slug)
  const siteDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'hayatsupplies.com'

  const articleSchema = content.article_schema
    ? JSON.parse(content.article_schema)
    : {
        '@context': 'https://schema.org',
        '@type':    'Article',
        headline:   content.title,
        description: content.meta_description,
        author: { '@type': 'Organization', name: 'Hayat Supplies' },
        publisher: { '@type': 'Organization', name: 'Hayat Supplies', url: `https://${siteDomain}` },
        datePublished: content.published_at || new Date().toISOString(),
        dateModified:  content.last_updated  || new Date().toISOString(),
      }

  const faqSchema = content.faq_schema ? JSON.parse(content.faq_schema) : null

  // Detect step-based content and generate HowTo schema
  const stepHeadings = (content.body ?? '').match(/^##\s+(Step\s+\d+|How\s+to\s+.+)/gmi) ?? []
  let howToJson: string | null = null
  if (stepHeadings.length >= 2) {
    const steps = stepHeadings.map(h => {
      const name = h.replace(/^##\s+/, '')
      // Extract the paragraph following this heading
      const escaped  = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const afterMatch = content.body.match(new RegExp(`##\\s+${escaped}\\s*\\n+([^\\n#]+)`, 'i'))
      return { name, text: afterMatch?.[1]?.trim() ?? name }
    })
    howToJson = generateHowToSchema(content.title, steps)
  }

  const bodyHtml       = renderMarkdown(content.body)
  const breadcrumbJson = generateBreadcrumb([
    { name: 'Home',   url: '/' },
    { name: 'Guides', url: '/guides' },
    { name: content.title, url: `/guides/${params.slug}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      {faqSchema    && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      {howToJson    && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: howToJson }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJson }} />

      <div className="container-page py-10 pb-16">
        <nav className="text-xs font-body text-slate-muted mb-6 flex items-center gap-1.5">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link href="/guides" className="hover:text-primary transition-colors">Guides</Link>
          <span>/</span>
          <span className="text-slate line-clamp-1">{content.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Main content */}
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
            {content.published_at && (
              <p className="text-xs font-body text-slate-muted mb-6">
                Published {new Date(content.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                {content.last_updated && content.last_updated !== content.published_at && (
                  <> · Updated {new Date(content.last_updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                )}
              </p>
            )}

            <div
              className="prose-content font-body text-slate leading-relaxed"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />

            {/* CTA */}
            <div className="mt-10 bg-primary/5 border border-primary/20 rounded-xl p-6">
              <h3 className="font-heading font-semibold text-primary-dark mb-2">Ready to order?</h3>
              <p className="font-body text-sm text-slate-muted mb-4">
                Hayat Supplies delivers {content.category ? content.category.replace(/-/g, ' ') : 'medical'} products to clinics and hospitals across Oman.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Link href={content.category ? `/products?category=${content.category}` : '/products'}
                  className="px-4 py-2 bg-primary text-white text-sm font-body font-semibold rounded-btn hover:bg-primary-dark transition-colors">
                  Browse Products
                </Link>
                <Link href="/quick-order"
                  className="px-4 py-2 border border-primary text-primary text-sm font-body font-semibold rounded-btn hover:bg-primary/5 transition-colors">
                  Quick Order
                </Link>
              </div>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            {related.length > 0 && (
              <div className="bg-surface rounded-xl border border-border p-4 sticky top-24">
                <h4 className="font-heading font-semibold text-sm text-primary-dark mb-3">Related Guides</h4>
                <div className="flex flex-col gap-2">
                  {related.map((r) => (
                    <Link key={r.content_id} href={`/guides/${r.content_id}`}
                      className="text-sm font-body text-slate hover:text-primary transition-colors py-1 border-b border-border last:border-0">
                      {r.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  )
}
