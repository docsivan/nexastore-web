/**
 * lib/ai-tables.ts
 * Transitional Airtable-dialect adapter over Supabase.
 *
 * The nexa/* analyst routes were written against Airtable's REST shape:
 * list responses of `{ records: [{ id, fields }] }`, creates that take
 * `{ fields }`, and PATCHes keyed by record id. Reproducing that shape here
 * let 18 routes migrate without rewriting their body logic, which is where
 * the actual business rules live.
 *
 * Prefer the typed helpers in lib/supabase.ts for new code. This exists so the
 * Airtable cutover stayed mechanical and reviewable; it can be unwound route by
 * route later.
 */

import { supabase } from './supabase'

/** Airtable table name -> Supabase table name. */
const TABLE_MAP: Record<string, string> = {
  Products:            'products',
  Orders:              'orders',
  Customers:           'customers',
  Pricing_Tiers:       'pricing_tiers',
  Nexa_Insights:       'ai_insights',
  Nexa_Log:            'ai_log',
  Nexa_SEO:            'ai_seo',
  Nexa_CRO:            'ai_cro',
  Haya_Memory:         'ai_memory',
  Haya_Content:        'ai_content',
  Haya_Reviews:        'ai_reviews',
  Haya_Trends:         'ai_trends',
  Haya_Search_Console: 'ai_search_console',
  Haya_Citations:      'ai_citations',
  Haya_Promotions:     'ai_promotions',
  Haya_Conversations:  'conversations',
  Haya_Cron_Log:       'cron_log',
  Haya_Waitlist:       'waitlist',
  Banners:             'banners',
  Disclaimers:         'disclaimers',
  Store_Config:        'store_config',
  Admin_Users:         'admin_users',
}

/**
 * Field aliases that differ between the Airtable and Supabase schemas.
 *
 * Scoped per table on purpose: `content_id` means the slug on Haya_Content,
 * but on Haya_Search_Console / Haya_Trends it is a plain reference to a
 * content row and must be left alone. A global alias would silently rewrite
 * those to `slug` and write to the wrong column.
 */
const GLOBAL_ALIASES: Record<string, string> = {
  nameAr:        'name_ar',
  descriptionAr: 'description_ar',
  categoryAr:    'category_ar',
}

const TABLE_ALIASES: Record<string, Record<string, string>> = {
  Haya_Content: {
    content_id:   'slug',
    content_tier: 'content_type',
  },
}

function aliasesFor(table: string): Record<string, string> {
  return { ...GLOBAL_ALIASES, ...(TABLE_ALIASES[table] ?? {}) }
}

function reverseAliasesFor(table: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(aliasesFor(table)).map(([k, v]) => [v, k])
  )
}

export function resolveTable(table: string): string {
  return TABLE_MAP[table] ?? table.toLowerCase()
}

/** fields (Airtable naming) -> columns (Supabase naming). */
function toColumns(fields: Record<string, unknown>, table: string): Record<string, unknown> {
  const alias = aliasesFor(table)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue
    out[alias[k] ?? k] = v
  }
  // orders.items is jsonb; callers hand us a JSON string
  if (typeof out.items === 'string') {
    try { out.items = JSON.parse(out.items as string) } catch { out.items = [] }
  }
  return out
}

/** columns (Supabase) -> fields (Airtable naming), plus the id envelope. */
function toRecord(row: Record<string, any>, table: string) {
  const rev = reverseAliasesFor(table)
  const { id, ...rest } = row
  const fields: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(rest)) {
    fields[rev[k] ?? k] = v
  }
  // Callers JSON.parse orders.items
  if (fields.items !== undefined && typeof fields.items !== 'string') {
    fields.items = JSON.stringify(fields.items ?? [])
  }
  return { id: String(id), fields, createdTime: row.created_at ?? undefined }
}

export interface AtListOptions {
  /** Column to filter with `>=`, paired with `since`. */
  orderBy?: string
  since?: string
  ascending?: boolean
  limit?: number
  /** Equality filters, in Airtable field naming. */
  match?: Record<string, unknown>
}

/** Airtable-shaped list. Returns `{ records }`, never throws. */
export async function atList(
  table: string,
  opts: AtListOptions = {}
): Promise<{ records: Array<{ id: string; fields: any; createdTime?: string }> }> {
  const { orderBy = 'created_at', since, ascending = false, limit = 500, match } = opts

  const run = async (withOrder: boolean) => {
    let q = supabase.from(resolveTable(table)).select('*')
    if (match) {
      for (const [k, v] of Object.entries(match)) {
        q = q.eq(aliasesFor(table)[k] ?? k, v as any)
      }
    }
    if (withOrder && since) q = q.gte(orderBy, since)
    if (withOrder) q = q.order(orderBy, { ascending })
    return q.limit(limit)
  }

  try {
    let { data, error } = await run(true)

    // 42703 = undefined_column. Not every table has the default `created_at`
    // sort key, and an unsortable column should degrade to unsorted rather
    // than silently returning zero rows — an empty result here previously
    // cascaded into duplicate-key errors downstream.
    if (error && (error as { code?: string }).code === '42703') {
      console.warn(
        `[ai-tables] ${table}: no sortable column "${orderBy}" — retrying unordered`
      )
      ;({ data, error } = await run(false))
    }

    if (error) throw error
    return { records: (data ?? []).map((r) => toRecord(r, table)) }
  } catch (e) {
    console.error(`[ai-tables] list ${table} failed:`, e)
    return { records: [] }
  }
}

/**
 * Drop-in replacement for the routes' local `atGet('/Table?query')` helpers.
 *
 * Translates the subset of Airtable query syntax this codebase actually uses:
 *   filterByFormula  {f}='v' · {f}="v" · IS_AFTER({f},"v") · AND(...) · NOT({f}="")
 *   sort[0][field] / sort[0][direction]
 *   maxRecords
 *
 * Anything it cannot parse is logged rather than silently dropped, so an
 * unsupported filter shows up as a warning instead of wrong data.
 */
export async function atGetPath(
  path: string
): Promise<{ records: Array<{ id: string; fields: any; createdTime?: string }> }> {
  const [rawTable, rawQuery = ''] = path.replace(/^\//, '').split('?')
  const table = decodeURIComponent(rawTable)
  const params = new URLSearchParams(rawQuery)

  const opts: AtListOptions = {}
  const max = params.get('maxRecords')
  if (max) opts.limit = Number(max)

  const sortField = params.get('sort[0][field]')
  if (sortField) {
    opts.orderBy = aliasesFor(table)[sortField] ?? sortField
    opts.ascending = params.get('sort[0][direction]') !== 'desc'
  }

  const formula = params.get('filterByFormula')
  if (formula) {
    const match: Record<string, unknown> = {}
    let consumed = ''

    // IS_AFTER({field},"value") -> since
    for (const m of Array.from(formula.matchAll(/IS_AFTER\(\{(\w+)\}\s*,\s*["']([^"']+)["']\)/g))) {
      opts.orderBy = aliasesFor(table)[m[1]] ?? m[1]
      opts.since = m[2]
      consumed += m[0]
    }
    // {field}='value' / {field}="value" -> equality (skip empty-string probes)
    for (const m of Array.from(formula.matchAll(/\{(\w+)\}\s*=\s*["']([^"']*)["']/g))) {
      if (m[2] === '') { consumed += m[0]; continue }
      match[m[1]] = m[2]
      consumed += m[0]
    }
    // {field}=1 / {field}=0 -> boolean
    for (const m of Array.from(formula.matchAll(/\{(\w+)\}\s*=\s*(1|0)(?![\d.])/g))) {
      match[m[1]] = m[2] === '1'
      consumed += m[0]
    }
    if (Object.keys(match).length) opts.match = match

    const leftover = formula
      .replace(/AND|OR|NOT|IS_AFTER|IS_BEFORE|TRUE\(\)|FALSE\(\)/g, '')
      .replace(/[(),\s]/g, '')
    const consumedStripped = consumed.replace(/[(),\s]/g, '')
    if (leftover && !consumedStripped.includes(leftover.slice(0, 8))) {
      console.warn(`[ai-tables] unparsed filter for ${table}: ${formula}`)
    }
  }

  return atList(table, opts)
}

/** Airtable-shaped single fetch by row id: replaces GET /Table/:id. */
export async function atGetOne(
  table: string,
  id: string
): Promise<{ id: string; fields: any; createdTime?: string } | null> {
  try {
    const { data, error } = await supabase
      .from(resolveTable(table))
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error || !data) return null
    return toRecord(data, table)
  } catch (e) {
    console.error(`[ai-tables] getOne ${table} failed:`, e)
    return null
  }
}

/** Airtable-shaped create. Returns the created record, or null on failure. */
export async function atCreate(
  table: string,
  fields: Record<string, unknown>
): Promise<{ id: string; fields: any } | null> {
  try {
    const { data, error } = await supabase
      .from(resolveTable(table))
      .insert(toColumns(fields, table))
      .select()
      .single()
    if (error) throw error
    return toRecord(data, table)
  } catch (e) {
    console.error(`[ai-tables] create ${table} failed:`, e)
    return null
  }
}

/** Bulk create. Returns the number of rows written. */
export async function atCreateMany(
  table: string,
  rows: Array<Record<string, unknown>>
): Promise<number> {
  if (!rows.length) return 0
  try {
    const { data, error } = await supabase
      .from(resolveTable(table))
      .insert(rows.map((r) => toColumns(r, table)))
      .select('id')
    if (error) throw error
    return (data ?? []).length
  } catch (e) {
    console.error(`[ai-tables] createMany ${table} failed:`, e)
    return 0
  }
}

/** Airtable-shaped PATCH by row id. */
export async function atPatch(
  table: string,
  id: string,
  fields: Record<string, unknown>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(resolveTable(table))
      .update(toColumns(fields, table))
      .eq('id', id)
    if (error) throw error
    return true
  } catch (e) {
    console.error(`[ai-tables] patch ${table} failed:`, e)
    return false
  }
}

/** Bulk PATCH. Returns how many rows updated. */
export async function atPatchMany(
  table: string,
  records: Array<{ id: string; fields: Record<string, unknown> }>
): Promise<number> {
  let updated = 0
  for (const r of records) {
    if (await atPatch(table, r.id, r.fields)) updated++
  }
  return updated
}

/** Upsert on a unique column. */
export async function atUpsert(
  table: string,
  fields: Record<string, unknown>,
  onConflict: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(resolveTable(table))
      .upsert(toColumns(fields, table), { onConflict })
    if (error) throw error
    return true
  } catch (e) {
    console.error(`[ai-tables] upsert ${table} failed:`, e)
    return false
  }
}
