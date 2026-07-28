import { NextRequest, NextResponse } from "next/server";
import { findCustomerById, updateAddresses } from "@/lib/customer-auth";
import type { CustomerAddress } from "@/lib/customer-auth";

function getSession(req: NextRequest) {
  try { return JSON.parse(req.cookies.get("ns_customer")?.value || "{}"); }
  catch { return {}; }
}

// GET — return all addresses for logged-in customer
export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session.customerId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const customer = await findCustomerById(session.customerId);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  return NextResponse.json({ addresses: customer.addresses });
}

// POST — add a new address
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session.customerId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid" }, { status: 400 }); }

  const customer = await findCustomerById(session.customerId);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const newAddr: CustomerAddress = {
    id:          `addr-${Date.now()}`,
    label:       body.label       || "Home",
    building:    body.building    || "",
    street:      body.street      || "",
    area:        body.area        || "",
    wilayat:     body.wilayat     || "",
    governorate: body.governorate || "Muscat",
    phone:       body.phone,
    lat:         body.lat,
    lng:         body.lng,
    isDefault:   customer.addresses.length === 0 || !!body.isDefault,
  };

  // If new address is default, unset others
  let addresses = customer.addresses.map(a => ({ ...a, isDefault: newAddr.isDefault ? false : a.isDefault }));
  addresses.push(newAddr);

  await updateAddresses(customer.recordId, addresses);
  return NextResponse.json({ success: true, address: newAddr, addresses });
}

// PUT — set default / update address
export async function PUT(req: NextRequest) {
  const session = getSession(req);
  if (!session.customerId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid" }, { status: 400 }); }

  const customer = await findCustomerById(session.customerId);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  let addresses = customer.addresses.map(a => {
    if (a.id !== body.id) return { ...a, isDefault: body.action === "setDefault" ? false : a.isDefault };
    if (body.action === "setDefault") return { ...a, isDefault: true };
    if (body.action === "delete") return null;
    return { ...a, ...body.updates };
  }).filter(Boolean) as CustomerAddress[];

  // Ensure at least one default
  if (addresses.length > 0 && !addresses.find(a => a.isDefault)) {
    addresses[0].isDefault = true;
  }

  await updateAddresses(customer.recordId, addresses);
  return NextResponse.json({ success: true, addresses });
}
