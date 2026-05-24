export interface ContentRecord {
  record_id:        string
  content_id:       string
  title:            string
  meta_title:       string
  meta_description: string
  body:             string
  faq_schema:       string
  article_schema:   string
  keywords:         string
  content_tier:     string
  category:         string
  status:           string
  word_count:       number
  published_at:     string
  last_updated:     string
}

const API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = process.env.AIRTABLE_BASE_ID!
const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`

export async function getContentBySlug(slug: string): Promise<ContentRecord | null> {
  if (!API_KEY || !BASE_ID) return null
  try {
    const formula = encodeURIComponent(`{content_id}="${slug}"`)
    const res     = await fetch(
      `${AT_BASE}/Haya_Content?filterByFormula=${formula}&maxRecords=1`,
      { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
    )
    if (!res.ok) return null
    const data = await res.json()
    const r    = data.records?.[0]
    if (!r) return null
    return {
      record_id:        r.id,
      content_id:       String(r.fields.content_id       ?? slug),
      title:            String(r.fields.title             ?? ''),
      meta_title:       String(r.fields.meta_title        ?? r.fields.title ?? ''),
      meta_description: String(r.fields.meta_description  ?? ''),
      body:             String(r.fields.body               ?? ''),
      faq_schema:       String(r.fields.faq_schema        ?? ''),
      article_schema:   String(r.fields.article_schema    ?? ''),
      keywords:         String(r.fields.keywords          ?? ''),
      content_tier:     String(r.fields.content_tier      ?? 'pillar'),
      category:         String(r.fields.category          ?? ''),
      status:           String(r.fields.status            ?? 'draft'),
      word_count:       Number(r.fields.word_count        ?? 0),
      published_at:     String(r.fields.published_at      ?? ''),
      last_updated:     String(r.fields.last_updated       ?? ''),
    }
  } catch { return null }
}

export async function getPublishedByCategory(category: string, excludeSlug?: string): Promise<ContentRecord[]> {
  if (!API_KEY || !BASE_ID) return []
  try {
    const formula = excludeSlug
      ? encodeURIComponent(`AND({status}="published",{category}="${category}",{content_id}!="${excludeSlug}")`)
      : encodeURIComponent(`AND({status}="published",{category}="${category}")`)
    const res = await fetch(
      `${AT_BASE}/Haya_Content?filterByFormula=${formula}&maxRecords=6`,
      { headers: { Authorization: `Bearer ${API_KEY}` }, cache: 'no-store' }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.records ?? []).map((r: { id: string; fields: Record<string, unknown> }) => ({
      record_id:        r.id,
      content_id:       String(r.fields.content_id       ?? r.id),
      title:            String(r.fields.title             ?? ''),
      meta_title:       String(r.fields.meta_title        ?? r.fields.title ?? ''),
      meta_description: String(r.fields.meta_description  ?? ''),
      body:             '',
      faq_schema:       '',
      article_schema:   '',
      keywords:         String(r.fields.keywords          ?? ''),
      content_tier:     String(r.fields.content_tier      ?? ''),
      category:         String(r.fields.category          ?? ''),
      status:           'published',
      word_count:       Number(r.fields.word_count        ?? 0),
      published_at:     String(r.fields.published_at      ?? ''),
      last_updated:     String(r.fields.last_updated       ?? ''),
    }))
  } catch { return [] }
}

/** Very basic markdown → HTML for server rendering without external deps */
export function renderMarkdown(md: string): string {
  if (!md) return ''

  let html = md
    // Headings
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm,  '<h3>$1</h3>')
    .replace(/^## (.+)$/gm,   '<h2>$1</h2>')
    .replace(/^# (.+)$/gm,    '<h1>$1</h1>')
    // Bold / italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Unordered lists
    .replace(/(^- .+$\n?)+/gm, (block) => {
      const items = block.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('')
      return `<ul>${items}</ul>`
    })
    // Ordered lists
    .replace(/(^\d+\. .+$\n?)+/gm, (block) => {
      const items = block.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('')
      return `<ol>${items}</ol>`
    })
    // Paragraphs (double newline)
    .replace(/\n\n(?!<[uoh])/g, '</p><p>')

  return `<p>${html}</p>`
    .replace(/<p>(<h[1-4]>)/g, '$1')
    .replace(/(<\/h[1-4]>)<\/p>/g, '$1')
    .replace(/<p>(<[uo]l>)/g, '$1')
    .replace(/(<\/[uo]l>)<\/p>/g, '$1')
    .replace(/<p>(<hr>)<\/p>/g, '$1')
    .replace(/<p>\s*<\/p>/g, '')
}
