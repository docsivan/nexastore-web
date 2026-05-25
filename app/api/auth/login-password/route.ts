import { NextRequest, NextResponse } from "next/server";
import { findCustomerByPhone, verifyPassword } from "@/lib/customer-auth";
import { checkRateLimit, getClientIp, rlKey, rlResponse, RATE_CONFIGS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(rlKey(ip, "auth"), RATE_CONFIGS.auth);
  if (!rl.ok) return rlResponse(rl.resetIn, rl.blocked);

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { phone, password } = body;
  if (!phone || !password) {
    return NextResponse.json({ error: "Phone and password required" }, { status: 400 });
  }

  const customer = await findCustomerByPhone(phone);
  if (!customer || !customer.password_hash) {
    return NextResponse.json({ error: "No account found. Please register first." }, { status: 404 });
  }

  const valid = await verifyPassword(customer.password_hash, password);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({
    success: true,
    hasAddress: customer.addresses.length > 0,
    defaultAddress: customer.addresses.find(a => a.isDefault) || null,
  });
  res.cookies.set("ns_customer", JSON.stringify({
    customerId: customer.customer_id,
    name: customer.customer_name,
    phone: customer.phone,
    email: customer.email,
  }), { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  return res;
}
