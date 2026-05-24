import bcrypt from 'bcryptjs'

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

const SUPER_ADMINS: AdminUser[] = [
  {
    id: 'admin_001',
    name: 'Siva',
    email: 'docsivan@gmail.com',
    role: 'super_admin',
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'admin_000',
    name: 'Backup Admin',
    email: 'director@alfarsi.me',
    role: 'super_admin',
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
  },
]

const BASE_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`
const AT_HEADERS = {
  'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
}
const ADMIN_USERS_TABLE = 'Admin_Users'

export function getSuperAdmins(): AdminUser[] {
  return SUPER_ADMINS
}

export function getSuperAdminEmails(): string[] {
  return SUPER_ADMINS.map(u => u.email)
}

export function findSuperAdmin(email: string): AdminUser | undefined {
  return SUPER_ADMINS.find(u => u.email.toLowerCase() === email.toLowerCase())
}

async function atFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, { ...opts, headers: { ...AT_HEADERS, ...(opts.headers ?? {}) } })
  if (!res.ok) throw new Error(`Airtable ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  try {
    const fields = ['name','email','role','password_hash','must_change_password','is_active','last_login','created_at']
    const qs = fields.map(f => `fields%5B%5D=${encodeURIComponent(f)}`).join('&')
    const data = await atFetch(`/${ADMIN_USERS_TABLE}?${qs}`)
    const dynamic: AdminUser[] = (data.records ?? []).map((r: { fields: AdminUser }) => ({ ...r.fields }))
    const superEmails = new Set(SUPER_ADMINS.map(u => u.email.toLowerCase()))
    const filtered = dynamic.filter(u => !superEmails.has(u.email.toLowerCase()))
    return [...SUPER_ADMINS, ...filtered]
  } catch {
    return [...SUPER_ADMINS]
  }
}

export async function findAdminUser(email: string): Promise<AdminUser | undefined> {
  const superAdmin = findSuperAdmin(email)
  if (superAdmin) return superAdmin

  try {
    const formula = encodeURIComponent(`{email}="${email.replace(/"/g, '\\"')}"`)
    const data = await atFetch(`/${ADMIN_USERS_TABLE}?filterByFormula=${formula}&maxRecords=1`)
    const rec = data.records?.[0]
    if (!rec) return undefined
    return { ...rec.fields, _recordId: rec.id } as AdminUser & { _recordId: string }
  } catch {
    return undefined
  }
}

export async function createAdminUser(user: Omit<AdminUser, 'created_at'> & { plainPassword: string }): Promise<AdminUser> {
  const password_hash = await bcrypt.hash(user.plainPassword, 12)
  const fields = {
    name:                 user.name,
    email:                user.email,
    role:                 user.role,
    password_hash,
    must_change_password: true,
    is_active:            true,
    created_at:           new Date().toISOString(),
  }
  const data = await atFetch(`/${ADMIN_USERS_TABLE}`, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  })
  return data.fields as AdminUser
}

export async function updateAdminUserPassword(email: string, plainPassword: string): Promise<boolean> {
  try {
    const formula = encodeURIComponent(`{email}="${email.replace(/"/g, '\\"')}"`)
    const data = await atFetch(`/${ADMIN_USERS_TABLE}?filterByFormula=${formula}&maxRecords=1`)
    const rec = data.records?.[0]
    const password_hash = await bcrypt.hash(plainPassword, 12)

    if (rec) {
      await atFetch(`/${ADMIN_USERS_TABLE}/${rec.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields: { password_hash, must_change_password: false } }),
      })
    } else {
      // Create row for super admin on first password set
      const admin = findSuperAdmin(email)
      if (admin) {
        await atFetch(`/${ADMIN_USERS_TABLE}`, {
          method: 'POST',
          body: JSON.stringify({ fields: {
            name: admin.name, email: admin.email,
            role: admin.role, password_hash, must_change_password: false,
            is_active: true, created_at: new Date().toISOString(),
          }}),
        })
      }
    }
    return true
  } catch {
    return false
  }
}

export async function verifyAdminPassword(email: string, plainPassword: string): Promise<boolean> {
  try {
    const formula = encodeURIComponent(`{email}="${email.replace(/"/g, '\\"')}"`)
    const data = await atFetch(`/${ADMIN_USERS_TABLE}?filterByFormula=${formula}&maxRecords=1`)
    const rec = data.records?.[0]
    if (!rec?.fields?.password_hash) return false
    return bcrypt.compare(plainPassword, rec.fields.password_hash)
  } catch {
    return false
  }
}

export async function recordLastLogin(email: string): Promise<void> {
  try {
    const formula = encodeURIComponent(`{email}="${email.replace(/"/g, '\\"')}"`)
    const data = await atFetch(`/${ADMIN_USERS_TABLE}?filterByFormula=${formula}&maxRecords=1`)
    const rec = data.records?.[0]
    if (!rec) return
    await atFetch(`/${ADMIN_USERS_TABLE}/${rec.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: { last_login: new Date().toISOString() } }),
    })
  } catch {}
}

export async function deactivateAdminUser(email: string): Promise<boolean> {
  try {
    const formula = encodeURIComponent(`{email}="${email.replace(/"/g, '\\"')}"`)
    const data = await atFetch(`/${ADMIN_USERS_TABLE}?filterByFormula=${formula}&maxRecords=1`)
    const rec = data.records?.[0]
    if (!rec) return false
    await atFetch(`/${ADMIN_USERS_TABLE}/${rec.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: { is_active: false } }),
    })
    return true
  } catch {
    return false
  }
}
