import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Obsolete. This route used the Airtable meta API
 * (/v0/meta/bases/:base/tables) to create tables and fields at runtime.
 *
 * Under Supabase the schema is owned by version-controlled migrations in
 * supabase/migrations/, so runtime schema creation is neither needed nor
 * desirable. Kept as an explicit 410 rather than deleted so any lingering
 * bookmark or script gets a clear answer instead of a 404.
 *
 * Safe to delete once confirmed nothing calls it.
 */
function gone() {
  return NextResponse.json(
    {
      error: 'Endpoint retired',
      detail:
        'Schema is managed by supabase/migrations/. This Airtable meta-API setup route is no longer used.',
    },
    { status: 410 }
  )
}

export async function GET()  { return gone() }
export async function POST() { return gone() }
