import { notFound }    from 'next/navigation'
import type { Metadata } from 'next'
import Link              from 'next/link'
import { getContentBySlug, renderMarkdown } from '@/lib/content-helpers'
import { generateBreadcrumb } from '@/lib/schema'

export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const content = await getContentBySlug(params.slug)
  if (!content || content.status !== 'published') return { title: 'FAQ Not Found' }
  return {
    title:       content.meta_title || `${content.title} | Hayat Supplies`,
    description: content.meta_description,
    keywords:    content.keywords,
  }
}

export default async function FaqPage({ params }: Props) {
  const content = await getContentBySlug(params.slug)
  if (!content || content.status !== 'published') notFound()

  const faqSchema      = content.faq_schema ? JSON.parse(content.faq_schema) : null
  const bodyHtml       = renderMarkdown(content.body)
  const breadcrumbJson = generateBreadcrumb([
    { name: 'Home', url: '/' },
    { name: 'FAQ',  url: '/guides' },
    { name: content.title, url: `/faq/${params.slug}` },
  ])

  return (
    <>
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJson }} />

      <div className="container-page py-10 pb-16 max-w-3xl">
        <nav className="text-xs font-body text-slate-muted mb-6 flex items-center gap-1.5">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link href="/guides" className="hover:text-primary transition-colors">Guides</Link>
          <span>/</span>
          <span className="text-slate line-clamp-1">{content.title}</span>
        </nav>

        {content.category && (
          <span className="inline-block text-xs font-body font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize mb-4">
            FAQ · {content.category.replace(/-/g, ' ')}
          </span>
        )}
        <h1 className="font-heading text-3xl font-bold text-primary-dark mb-3 leading-tight">{content.title}</h1>
        {content.meta_description && (
          <p className="font-body text-slate-muted text-base mb-8 leading-relaxed">{content.meta_description}</p>
        )}

        <div
          className="prose-content font-body text-slate leading-relaxed"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />

        <div className="mt-10 pt-6 border-t border-border">
          <p className="font-body text-sm text-slate-muted">
            Have more questions?{' '}
            <Link href="/contact" className="text-primary hover:underline">Contact our team</Link>
            {' '}or{' '}
            <Link href="/products" className="text-primary hover:underline">browse our products</Link>.
          </p>
        </div>
      </div>
    </>
  )
}
