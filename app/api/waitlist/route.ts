import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, phone, lang } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (!phone || phone.trim().length < 8) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }

    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Haya_Waitlist`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          source: "coming_soon_page",
          signed_up_at: new Date().toISOString().split("T")[0],
          lang: lang || "en",
          status: "new",
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Airtable error:", err);
      return NextResponse.json({ error: "Airtable error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Waitlist route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
