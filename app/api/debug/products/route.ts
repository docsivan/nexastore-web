import { NextResponse } from 'next/server'
import { getProducts } from '@/lib/supabase'

/**
 * Connectivity probe for the Supabase product catalogue.
 * Reports only whether credentials are present — never their values.
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  try {
    const records = await getProducts()
    return NextResponse.json({
      supabaseUrl,
      hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      recordCount:   records.length,
      firstProduct:  records[0]?.fields?.name ?? 'none',
      error:         null,
    })
  } catch (e) {
    return NextResponse.json({
      supabaseUrl,
      hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      recordCount:   0,
      firstProduct:  'none',
      error:         e instanceof Error ? e.message : String(e),
    })
  }
}
