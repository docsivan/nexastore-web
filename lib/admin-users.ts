import bcrypt from 'bcryptjs'
import { supabase } from './supabase'

export type AdminRole = 'super_admin' | 'admin' | 'staff'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: AdminRole
  password_hash?: string
  must_change_password?: boolean
  is_active: boolean
  last_login?: string
  created_at: string
}

/**
 * Hardcoded fallback super admins, always present even if the table is empty
 * so the panel can never lock everyone out.
 *
 * HARD RULE: this list is restricted to Zevio-owned addresses. A second
 * hardcoded super_admin on an external, out-of-scope domain was removed on
 * 2026-07-30 and must not be reintroduced. Grant additional admins through the
 * `admin_users` table instead of adding them here.
 */
const SUPER_ADMINS: AdminUser[] = [
  {
    id: 'admin_001',
    name: 'Siva',
    email: 'docsivan@gmail.com',
    role: 'super_admin',
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
  },
]

export function getSuperAdmins(): AdminUser[] {
  return SUPER_ADMINS
}

export function getSuperAdminEmails(): string[] {
  return SUPER_ADMINS.map(u => u.email)
}

export function findSuperAdmin(email: string): AdminUser | undefined {
  return SUPER_ADMINS.find(u => u.email.toLowerCase() === email.toLowerCase())
}

/** Fetches a single admin_users row by email, or null. */
async function fetchByEmail(email: string) {
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('name,email,role,password_hash,must_change_password,is_active,last_login,created_at')
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as unknown as AdminUser[]
    const superEmails = new Set(SUPER_ADMINS.map(u => u.email.toLowerCase()))
    const filtered = rows.filter(u => !superEmails.has(u.email.toLowerCase()))
    return [...SUPER_ADMINS, ...filtered]
  } catch {
    return [...SUPER_ADMINS]
  }
}

export async function findAdminUser(email: string): Promise<AdminUser | undefined> {
  const superAdmin = findSuperAdmin(email)
  if (superAdmin) return superAdmin

  try {
    const rec = await fetchByEmail(email)
    if (!rec) return undefined
    return { ...(rec as unknown as AdminUser), _recordId: String(rec.id) } as AdminUser & { _recordId: string }
  } catch {
    return undefined
  }
}

export async function createAdminUser(user: Omit<AdminUser, 'created_at'> & { plainPassword: string }): Promise<AdminUser> {
  const password_hash = await bcrypt.hash(user.plainPassword, 12)
  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      name:                 user.name,
      email:                user.email,
      role:                 user.role,
      password_hash,
      must_change_password: true,
      is_active:            true,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as AdminUser
}

export async function updateAdminUserPassword(email: string, plainPassword: string): Promise<boolean> {
  try {
    const password_hash = await bcrypt.hash(plainPassword, 12)
    const admin = findSuperAdmin(email)

    // Upsert covers both cases the Airtable version handled separately:
    // patching an existing row, and creating one for a super admin on first
    // password set. email is unique, so onConflict resolves it.
    const { error } = await supabase
      .from('admin_users')
      .upsert(
        {
          email,
          password_hash,
          must_change_password: false,
          is_active: true,
          ...(admin ? { name: admin.name, role: admin.role } : {}),
        },
        { onConflict: 'email' }
      )
    if (error) throw new Error(error.message)
    return true
  } catch {
    return false
  }
}

export async function verifyAdminPassword(email: string, plainPassword: string): Promise<boolean> {
  try {
    const rec = await fetchByEmail(email)
    if (!rec?.password_hash) return false
    return bcrypt.compare(plainPassword, rec.password_hash)
  } catch {
    return false
  }
}

export async function recordLastLogin(email: string): Promise<void> {
  try {
    await supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('email', email)
  } catch {}
}

export async function deactivateAdminUser(email: string): Promise<boolean> {
  try {
    const rec = await fetchByEmail(email)
    if (!rec) return false
    const { error } = await supabase
      .from('admin_users')
      .update({ is_active: false })
      .eq('email', email)
    if (error) throw new Error(error.message)
    return true
  } catch {
    return false
  }
}
