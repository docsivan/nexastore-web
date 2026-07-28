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

import { supabase } from './supabase'

/**
 * Maps an ai_content row onto ContentRecord.
 * Airtable's `content_id` is the Supabase `slug`, and `content_tier` is
 * `content_type`. Pass summary: true for listings, which omit the body.
 */
function toContentRecord(row: any, summary = false): ContentRecord {
  return {
    record_id:        String(row.id),
    content_id:       String(row.slug ?? row.id),
    title:            String(row.title ?? ''),
    meta_title:       String(row.meta_title ?? row.title ?? ''),
    meta_description: String(row.meta_description ?? ''),
    body:             summary ? '' : String(row.body ?? ''),
    faq_schema:       summary ? '' : String(row.faq_schema ?? ''),
    article_schema:   summary ? '' : String(row.article_schema ?? ''),
    keywords:         String(row.keywords ?? ''),
    content_tier:     String(row.content_type ?? (summary ? '' : 'pillar')),
    category:         String(row.category ?? ''),
    status:           String(row.status ?? 'draft'),
    word_count:       Number(row.word_count ?? 0),
    published_at:     String(row.published_at ?? ''),
    last_updated:     String(row.last_updated ?? ''),
  }
}

export async function getContentBySlug(slug: string): Promise<ContentRecord | null> {
  try {
    const { data, error } = await supabase
      .from('ai_content')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
    if (error || !data) return null
    return toContentRecord(data)
  } catch { return null }
}

export async function getPublishedByCategory(category: string, excludeSlug?: string): Promise<ContentRecord[]> {
  try {
    let query = supabase
      .from('ai_content')
      .select('*')
      .eq('status', 'published')
      .eq('category', category)
      .limit(6)
    if (excludeSlug) query = query.neq('slug', excludeSlug)
    const { data, error } = await query
    if (error) return []
    return (data ?? []).map((r) => toContentRecord(r, true))
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
