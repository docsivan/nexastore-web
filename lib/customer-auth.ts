/**
 * NexaStore — Customer Auth Helpers
 * Shared between registration, login, and address routes
 */
import bcrypt from "bcryptjs";

const BASE = process.env.AIRTABLE_BASE_ID!;
const KEY  = process.env.AIRTABLE_API_KEY!;
const AT   = (p: string) => `https://api.airtable.com/v0/${BASE}/${p}`;
const HDR  = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

export interface CustomerAddress {
  id:          string;
  label:       string;  // Home / Work / Clinic
  building:    string;
  street:      string;
  area:        string;
  wilayat:     string;
  governorate: string;
  phone?:      string;
  lat?:        number;
  lng?:        number;
  isDefault:   boolean;
}

export interface CustomerRecord {
  airtableId:   string;
  customer_id:  string;
  customer_name:string;
  phone:        string;
  email:        string;
  password_hash?:string;
  addresses:    CustomerAddress[];
}

export async function findCustomerByPhone(phone: string): Promise<CustomerRecord | null> {
  const clean = phone.replace(/\s/g, "");
  const url = AT(`Customers?filterByFormula={phone}="${clean}"&maxRecords=1`);
  const r = await fetch(url, { headers: HDR });
  const d = await r.json();
  if (!d.records?.length) return null;
  return parseCustomer(d.records[0]);
}

export async function findCustomerById(id: string): Promise<CustomerRecord | null> {
  const url = AT(`Customers?filterByFormula={customer_id}="${id}"&maxRecords=1`);
  const r = await fetch(url, { headers: HDR });
  const d = await r.json();
  if (!d.records?.length) return null;
  return parseCustomer(d.records[0]);
}

export function parseCustomer(rec: any): CustomerRecord {
  let addresses: CustomerAddress[] = [];
  try { addresses = JSON.parse(rec.fields.addresses || "[]"); } catch {}
  return {
    airtableId:    rec.id,
    customer_id:   rec.fields.customer_id  || rec.id,
    customer_name: rec.fields.customer_name || rec.fields.name || "",
    phone:         rec.fields.phone || "",
    email:         rec.fields.email || "",
    password_hash: rec.fields.password_hash,
    addresses,
  };
}

export async function createCustomer(data: {
  name: string; phone: string; email: string;
  password: string; address?: CustomerAddress;
}): Promise<CustomerRecord> {
  const hash = await bcrypt.hash(data.password, 12);
  const customer_id = `CUST-${Date.now()}`;
  const addresses: CustomerAddress[] = data.address
    ? [{ ...data.address, id: `addr-${Date.now()}`, isDefault: true }] : [];

  const res = await fetch(AT("Customers"), {
    method: "POST", headers: HDR,
    body: JSON.stringify({ fields: {
      customer_id,
      customer_name: data.name,
      phone:         data.phone.replace(/\s/g, ""),
      email:         data.email,
      password_hash: hash,
      addresses:     JSON.stringify(addresses),
      address:       addresses[0]
        ? `${addresses[0].building}, ${addresses[0].street}, ${addresses[0].area}, ${addresses[0].wilayat}, ${addresses[0].governorate}`
        : "",
      is_active:     true,
      preferred_channel: "web",
    }})
  });
  const d = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(d));
  return parseCustomer(d);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function updateAddresses(airtableId: string, addresses: CustomerAddress[]): Promise<void> {
  const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
  await fetch(AT(`Customers/${airtableId}`), {
    method: "PATCH", headers: HDR,
    body: JSON.stringify({ fields: {
      addresses: JSON.stringify(addresses),
      address: defaultAddr
        ? `${defaultAddr.building}, ${defaultAddr.street}, ${defaultAddr.area}, ${defaultAddr.wilayat}, ${defaultAddr.governorate}`
        : "",
    }})
  });
}
