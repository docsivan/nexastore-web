'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getCustomerSession, clearCustomerSession, CustomerSession } from '@/lib/session'

interface AuthContextType {
  customer: CustomerSession | null
  isLoggedIn: boolean
  logout: () => void
  refresh: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerSession | null>(null)

  const refresh = () => {
    const session = getCustomerSession()
    setCustomer(session)
  }

  useEffect(() => {
    refresh()
    // Re-check when localStorage changes (e.g. login in another tab)
    const handler = () => refresh()
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const logout = () => {
    clearCustomerSession()
    setCustomer(null)
  }

  return (
    <AuthContext.Provider value={{
      customer,
      isLoggedIn: !!customer,
      logout,
      refresh,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
