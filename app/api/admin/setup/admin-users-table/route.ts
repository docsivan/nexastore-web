import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.AIRTABLE_BASE_ID!;
const KEY  = process.env.AIRTABLE_API_KEY!;

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (auth.replace("Bearer ", "") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // Create Admin_Users table via Airtable Meta API
    const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Admin_Users",
        fields: [
          { name: "email",           type: "email" },
          { name: "password_hash",   type: "singleLineText" },
          { name: "role",            type: "singleLineText" },
          { name: "is_active",       type: "checkbox", options: { color: "greenBright", icon: "check" } },
          { name: "failed_attempts", type: "number",   options: { precision: 0 } },
          { name: "locked_until",    type: "dateTime", options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "Asia/Muscat" } },
          { name: "last_login",      type: "dateTime", options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "Asia/Muscat" } },
          { name: "created_at",      type: "dateTime", options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "Asia/Muscat" } },
          { name: "reset_otp",       type: "singleLineText" },
          { name: "reset_otp_expiry",type: "singleLineText" },
        ]
      })
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data }, { status: 400 });
    return NextResponse.json({ success: true, tableId: data.id, message: "Admin_Users table created" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
