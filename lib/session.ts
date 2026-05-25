// lib/session.ts
// Customer: localStorage (persists across tabs/sessions)
// Admin:    sessionStorage (auto-clears when tab closes)

export interface CustomerSession {
  phone: string
  customer_name: string
  clinic_name: string
  customer_id: string
  city: string
  email: string
  address: string
}

const CUSTOMER_KEY = 'ns_customer'
const ADMIN_KEY    = 'hs_admin_pin'

export function getCustomerSession(): CustomerSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY)
    return raw ? (JSON.parse(raw) as CustomerSession) : null
  } catch { return null }
}

export function setCustomerSession(s: CustomerSession): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CUSTOMER_KEY, JSON.stringify(s))
}

export function clearCustomerSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CUSTOMER_KEY)
}

export function getAdminPin(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(ADMIN_KEY)
}

export function setAdminPin(pin: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(ADMIN_KEY, pin)
}

export function clearAdminPin(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(ADMIN_KEY)
}
