import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { email, phone, lang } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (!phone || phone.trim().length < 8) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }

    const { error } = await supabase.from("waitlist").insert({
      email:        email.trim().toLowerCase(),
      phone:        phone.trim(),
      source:       "coming_soon_page",
      signed_up_at: new Date().toISOString().split("T")[0],
      lang:         lang || "en",
      status:       "new",
    });

    if (error) {
      console.error("Waitlist insert error:", error.message);
      return NextResponse.json({ error: "Could not join waitlist" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Waitlist route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
