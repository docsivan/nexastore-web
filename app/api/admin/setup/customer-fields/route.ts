/**
 * Adds password_hash and addresses fields to Customers table.
 * Run once: POST /api/admin/setup/customer-fields
 */
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (auth.replace("Bearer ", "") !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const BASE = process.env.AIRTABLE_BASE_ID!;
  const KEY  = process.env.AIRTABLE_API_KEY!;

  // First get the Customers table ID
  const tablesRes = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`,
    { headers: { Authorization: `Bearer ${KEY}` } });
  const tablesData = await tablesRes.json();
  const customersTable = tablesData.tables?.find((t: any) => t.name === "Customers");
  if (!customersTable) return NextResponse.json({ error: "Customers table not found" }, { status: 404 });

  const tableId = customersTable.id;
  const existing = customersTable.fields.map((f: any) => f.name);
  const results: any[] = [];

  const fieldsToAdd = [
    { name: "password_hash", type: "singleLineText" },
    { name: "addresses",     type: "multilineText"  },
  ];

  for (const field of fieldsToAdd) {
    if (existing.includes(field.name)) {
      results.push({ field: field.name, status: "already exists" });
      continue;
    }
    const r = await fetch(
      `https://api.airtable.com/v0/meta/bases/${BASE}/tables/${tableId}/fields`,
      { method: "POST", headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(field) }
    );
    const d = await r.json();
    results.push({ field: field.name, status: r.ok ? "created" : "error", detail: d });
  }

  return NextResponse.json({ success: true, results });
}
