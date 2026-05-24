import type { Metadata } from 'next'
import Link              from 'next/link'
import { generateItemListSchema } from '@/lib/schema'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title:       'Medical Supplies in Oman | Hayat Supplies Muscat',
  description: 'Hayat Supplies serves clinics and hospitals across Oman with MOH-compliant medical, dental, infection control, PPE, and sterilization supplies.',
  keywords:    ['medical supplies oman', 'dental supplies muscat', 'infection control oman', 'PPE oman', 'MOH compliant supplies'],
}

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'hayatsupplies.com'

interface LocalPage {
  slug:             string
  title:            string
  meta_description: string
  category:         string
  published_at:     string
}

async function getLocalPages(): Promise<LocalPage[]> {
  if (!API_KEY || !BASE_ID) return []
  try {
    const formula = encodeURIComponent(
      `AND({content_tier}="local",{status}="published")`
    )
    const res = await fetch(
      `${AT_BASE}/Haya_Content?filterByFormula=${formula}&sort[0][field]=published_at&sort[0][direction]=desc&maxRecords=50`,
      { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.records ?? []).map((r: { fields: Record<string, unknown> }) => ({
      slug:             String(r.fields.content_id       ?? ''),
      title:            String(r.fields.title             ?? ''),
      meta_description: String(r.fields.meta_description  ?? ''),
      category:         String(r.fields.category          ?? ''),
      published_at:     String(r.fields.published_at      ?? ''),
    }))
  } catch { return [] }
}

const CATEGORY_COLORS: Record<string, string> = {
  'infection-control': 'bg-blue-50 text-blue-700',
  'dental-supplies':   'bg-teal-50 text-teal-700',
  'ppe':               'bg-orange-50 text-orange-700',
  'diagnostics':       'bg-purple-50 text-purple-700',
  'sterilization':     'bg-green-50 text-green-700',
  'medical-devices':   'bg-slate-100 text-slate-700',
}

export default async function OmanIndexPage() {
  const pages = await getLocalPages()

  const itemListJson = generateItemListSchema(
    pages.map((p, i) => ({
      name:     p.title,
      url:      `https://${SITE_DOMAIN}/oman/${p.slug}`,
      position: i + 1,
    }))
  )

  return (
    <>
      {pages.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListJson }} />
      )}

      <div className="container-page py-10 pb-16">
        <div className="mb-8">
          <nav className="text-xs font-body text-slate-muted mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <span className="text-slate">Oman</span>
          </nav>
          <h1 className="font-heading text-3xl font-bold text-primary-dark">
            Medical Supplies in Oman
          </h1>
          <p className="font-body text-slate-muted mt-2 max-w-2xl">
            Hayat Supplies is Muscat&apos;s trusted procurement partner for clinics, dental practices, and hospitals. MOH-compliant products delivered across the Sultanate of Oman.
          </p>
        </div>

        {pages.length === 0 ? (
          <div className="text-center py-20 bg-surface rounded-xl border border-border">
            <p className="font-body text-slate-muted">Local pages coming soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pages.map(page => (
              <Link key={page.slug} href={`/oman/${page.slug}`}
                className="bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all p-5 flex flex-col gap-3">
                {page.category && (
                  <span className={`text-xs font-body font-medium px-2 py-0.5 rounded-full self-start capitalize ${CATEGORY_COLORS[page.category] ?? 'bg-gray-100 text-gray-600'}`}>
                    {page.category.replace(/-/g, ' ')}
                  </span>
                )}
                <h2 className="font-heading font-semibold text-primary-dark text-base leading-snug">{page.title}</h2>
                {page.meta_description && (
                  <p className="font-body text-sm text-slate-muted line-clamp-2">{page.meta_description}</p>
                )}
                <p className="text-xs font-body text-primary mt-auto pt-3 border-t border-border font-medium">
                  Read more →
                </p>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12 bg-primary/5 border border-primary/20 rounded-xl p-8 text-center">
          <h2 className="font-heading font-bold text-xl text-primary-dark mb-2">
            Shop All Products
          </h2>
          <p className="font-body text-slate-muted text-sm mb-5 max-w-lg mx-auto">
            Browse our full catalogue of MOH-compliant medical, dental, infection control, PPE, diagnostics, and sterilization supplies.
          </p>
          <Link href="/products"
            className="inline-block px-6 py-3 bg-primary text-white font-body font-semibold rounded-btn hover:bg-primary-dark transition-colors">
            Browse All Products
          </Link>
        </div>
      </div>
    </>
  )
}
