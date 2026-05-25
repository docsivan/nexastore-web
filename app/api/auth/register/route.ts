import { NextRequest, NextResponse } from "next/server";
import { findCustomerByPhone, createCustomer } from "@/lib/customer-auth";
import { checkRateLimit, getClientIp, rlKey, rlResponse, RATE_CONFIGS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(rlKey(ip, "auth"), RATE_CONFIGS.auth);
  if (!rl.ok) return rlResponse(rl.resetIn, rl.blocked);

  let body: any;
  try { body = await req.json(); } 
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { name, phone, email, password, address } = body;

  if (!name?.trim() || !phone?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "Name, phone and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  // Check phone not already registered
  const existing = await findCustomerByPhone(phone);
  if (existing) {
    if (existing.password_hash) {
      return NextResponse.json({ error: "Phone number already registered. Please log in." }, { status: 409 });
    }
    // Phone exists (OTP customer) but no password — upgrade account
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash(password, 12);
    await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Customers/${existing.airtableId}`,
      { method: "PATCH",
        headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { password_hash: hash, customer_name: name, email: email || existing.email } })
      }
    );
    const res = NextResponse.json({ success: true, upgraded: true });
    res.cookies.set("ns_customer", JSON.stringify({
      customerId: existing.customer_id, name, phone: existing.phone, email: email || existing.email,
    }), { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
    return res;
  }

  try {
    const customer = await createCustomer({ name, phone, email: email || "", password, address });
    const res = NextResponse.json({ success: true, customerId: customer.customer_id });
    res.cookies.set("ns_customer", JSON.stringify({
      customerId: customer.customer_id,
      name: customer.customer_name,
      phone: customer.phone,
      email: customer.email,
    }), { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
    return res;
  } catch (e: any) {
    console.error("Registration error:", e);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
