import { NextRequest } from 'next/server'
import crypto from 'crypto'

const COOKIE = 'nexa_admin_session'
const TTL    = 8 * 60 * 60 * 1000  // 8 hours

export const sessions = new Map<string, { at: number; userId?: string; userEmail?: string }>()

export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString('hex')
}

export function verifyAdminSession(req: NextRequest): boolean {
  const token = req.cookies.get(COOKIE)?.value
  if (!token) return false
  const s = sessions.get(token)
  if (!s) return false
  if (Date.now() - s.at > TTL) { sessions.delete(token); return false }
  return true
}

export function getSessionUser(req: NextRequest): { userId?: string; userEmail?: string } | null {
  const token = req.cookies.get(COOKIE)?.value
  if (!token) return null
  const s = sessions.get(token)
  if (!s) return null
  if (Date.now() - s.at > TTL) { sessions.delete(token); return null }
  return { userId: s.userId, userEmail: s.userEmail }
}

export { COOKIE as ADMIN_SESSION_COOKIE, TTL as ADMIN_SESSION_TTL }
