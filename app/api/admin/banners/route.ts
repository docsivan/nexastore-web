import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!
const ADMIN_PIN = process.env.ADMIN_PIN!

function checkAuth(req: NextRequest): boolean {
  return req.cookies.get('adminAuth')?.value === 'true'
}

interface BannerFields {
  title: string
  subtitle: string
  cta_text: string
  cta_url: string
  is_active: boolean
  display_order: number
}

interface AirtableBanner {
  id: string
  fields: BannerFields
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Banners`)
    url.searchParams.set('sort[0][field]', 'display_order')
    url.searchParams.set('sort[0][direction]', 'asc')

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      cache: 'no-store',
    })

    if (res.status === 404 || res.status === 422) return NextResponse.json({ banners: [] })
    if (!res.ok) return NextResponse.json({ banners: [] })

    const data = await res.json()
    const banners = (data.records ?? []).map((r: AirtableBanner) => ({
      id: r.id,
      ...r.fields,
    }))

    return NextResponse.json({ banners })
  } catch {
    return NextResponse.json({ banners: [] })
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Banners`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: body }),
    })

    if (!res.ok) return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
    const data = await res.json()
    return NextResponse.json({ id: data.id, ...data.fields })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id, ...fields } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Banners/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    })

    if (!res.ok) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Banners/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    })

    if (!res.ok) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
