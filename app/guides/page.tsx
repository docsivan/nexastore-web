import type { Metadata } from 'next'
import Link from 'next/link'
import { generateItemListSchema } from '@/lib/schema'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Healthcare Guides & Resources | Hayat Supplies Oman',
  description: 'Expert guides on infection control, dental supplies, PPE, diagnostics, and sterilization for clinics and hospitals in Oman.',
}

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

interface GuideEntry {
  slug:             string
  title:            string
  meta_description: string
  category:         string
  word_count:       number
  published_at:     string
}

async function getPublishedGuides(): Promise<GuideEntry[]> {
  if (!API_KEY || !BASE_ID) return []
  try {
    const formula = encodeURIComponent(`AND({status}="published",{content_tier}="pillar")`)
    const res     = await fetch(
      `${AT_BASE}/Haya_Content?filterByFormula=${formula}&sort[0][field]=published_at&sort[0][direction]=desc&maxRecords=50`,
      { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.records ?? []).map((r: { id: string; fields: Record<string, unknown> }) => ({
      slug:             String(r.fields.content_id ?? r.id),
      title:            String(r.fields.title            ?? ''),
      meta_description: String(r.fields.meta_description ?? ''),
      category:         String(r.fields.category         ?? ''),
      word_count:       Number(r.fields.word_count       ?? 0),
      published_at:     String(r.fields.published_at     ?? ''),
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

const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'hayatsupplies.com'

export default async function GuidesIndexPage() {
  const guides = await getPublishedGuides()

  const itemListJson = guides.length > 0
    ? generateItemListSchema(guides.map((g, i) => ({
        name:     g.title,
        url:      `https://${SITE_DOMAIN}/guides/${g.slug}`,
        position: i + 1,
      })))
    : null

  return (
    <>
    {itemListJson && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListJson }} />}
    <div className="container-page py-10 pb-16">
      <div className="mb-8">
        <nav className="text-xs font-body text-slate-muted mb-4 flex items-center gap-1.5">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <span className="text-slate">Guides</span>
        </nav>
        <h1 className="font-heading text-3xl font-bold text-primary-dark">Healthcare Guides</h1>
        <p className="font-body text-slate-muted mt-2 max-w-2xl">
          Expert resources for clinics, dental practices, and hospitals sourcing medical supplies in Oman.
        </p>
      </div>

      {guides.length === 0 ? (
        <div className="text-center py-20 bg-surface rounded-xl border border-border">
          <p className="font-body text-slate-muted">No guides published yet. Check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guides.map((guide) => (
            <Link key={guide.slug} href={`/guides/${guide.slug}`}
              className="bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all p-5 flex flex-col gap-3">
              {guide.category && (
                <span className={`text-xs font-body font-medium px-2 py-0.5 rounded-full self-start capitalize ${CATEGORY_COLORS[guide.category] ?? 'bg-gray-100 text-gray-600'}`}>
                  {guide.category.replace(/-/g, ' ')}
                </span>
              )}
              <h2 className="font-heading font-semibold text-primary-dark text-base leading-snug">{guide.title}</h2>
              {guide.meta_description && (
                <p className="font-body text-sm text-slate-muted line-clamp-2">{guide.meta_description}</p>
              )}
              <div className="flex items-center gap-3 mt-auto pt-3 border-t border-border text-xs font-body text-slate-muted">
                {guide.word_count > 0 && <span>{guide.word_count.toLocaleString()} words</span>}
                {guide.published_at && (
                  <span>{new Date(guide.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
    </>
  )
}
