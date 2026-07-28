/**
 * Zevio — Customer Auth Helpers
 * Shared between registration, login, and address routes.
 * Backed by the Supabase `customers` table.
 */
import bcrypt from "bcryptjs";
import { supabase } from "./supabase";

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
  /** Supabase row id — pass back to updateAddresses(). */
  recordId:      string;
  customer_id:   string;
  customer_name: string;
  phone:         string;
  email:         string;
  password_hash?:string;
  addresses:     CustomerAddress[];
}

/** `addresses` is jsonb in Supabase but was a JSON string in Airtable. */
function parseAddresses(raw: unknown): CustomerAddress[] {
  if (Array.isArray(raw)) return raw as CustomerAddress[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function parseCustomer(row: any): CustomerRecord {
  return {
    recordId:      String(row.id),
    customer_id:   row.customer_id  || String(row.id),
    customer_name: row.customer_name || row.name || "",
    phone:         row.phone || "",
    email:         row.email || "",
    password_hash: row.password_hash ?? undefined,
    addresses:     parseAddresses(row.addresses),
  };
}

export async function findCustomerByPhone(phone: string): Promise<CustomerRecord | null> {
  const clean = phone.replace(/\s/g, "");
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("phone", clean)
    .maybeSingle();
  if (error || !data) return null;
  return parseCustomer(data);
}

export async function findCustomerById(id: string): Promise<CustomerRecord | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("customer_id", id)
    .maybeSingle();
  if (error || !data) return null;
  return parseCustomer(data);
}

export async function createCustomer(data: {
  name: string; phone: string; email: string;
  password: string; address?: CustomerAddress;
}): Promise<CustomerRecord> {
  const hash = await bcrypt.hash(data.password, 12);
  const customer_id = `CUST-${Date.now()}`;
  const addresses: CustomerAddress[] = data.address
    ? [{ ...data.address, id: `addr-${Date.now()}`, isDefault: true }] : [];

  const { data: row, error } = await supabase
    .from("customers")
    .insert({
      customer_id,
      customer_name: data.name,
      phone:         data.phone.replace(/\s/g, ""),
      email:         data.email,
      password_hash: hash,
      addresses,
      address:       addresses[0]
        ? `${addresses[0].building}, ${addresses[0].street}, ${addresses[0].area}, ${addresses[0].wilayat}, ${addresses[0].governorate}`
        : "",
      preferred_channel: "web",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return parseCustomer(row);
}

/** Sets a password on an existing account that only had OTP access. */
export async function setCustomerPassword(
  recordId: string,
  password: string,
  updates: { customer_name?: string; email?: string } = {}
): Promise<void> {
  const hash = await bcrypt.hash(password, 12);
  const { error } = await supabase
    .from("customers")
    .update({ password_hash: hash, ...updates })
    .eq("id", recordId);
  if (error) throw new Error(error.message);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function updateAddresses(recordId: string, addresses: CustomerAddress[]): Promise<void> {
  const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
  const { error } = await supabase
    .from("customers")
    .update({
      addresses,
      address: defaultAddr
        ? `${defaultAddr.building}, ${defaultAddr.street}, ${defaultAddr.area}, ${defaultAddr.wilayat}, ${defaultAddr.governorate}`
        : "",
    })
    .eq("id", recordId);
  if (error) throw new Error(error.message);
}
