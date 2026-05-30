import { NextResponse } from 'next/server'

export async function GET() {
  const baseId = process.env.AIRTABLE_BASE_ID
  const apiKey = process.env.AIRTABLE_API_KEY

  const url = `https://api.airtable.com/v0/${baseId}/Products?maxRecords=3&filterByFormula={is_active}=1`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` }
  })
  const data = await res.json()

  return NextResponse.json({
    baseId: baseId?.substring(0, 8),
    apiKeySet: !!apiKey,
    status: res.status,
    recordCount: data.records?.length ?? 0,
    firstProduct: data.records?.[0]?.fields?.name ?? 'none',
    error: data.error ?? null
  })
}
