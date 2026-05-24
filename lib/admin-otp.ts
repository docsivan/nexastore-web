import crypto from 'crypto'

interface AdminOtpRecord {
  otp: string
  email: string
  expiry: number
}

// Global singleton — same pattern as customer otpStore
const g = global as typeof global & { _adminOtpStore?: Map<string, AdminOtpRecord> }
if (!g._adminOtpStore) g._adminOtpStore = new Map<string, AdminOtpRecord>()
const store = g._adminOtpStore

export function generateAdminOtp(email: string): string {
  const otp = String(Math.floor(100000 + Math.random() * 900000))
  store.set(email.toLowerCase(), { otp, email, expiry: Date.now() + 15 * 60 * 1000 })
  return otp
}

export function verifyAdminOtp(email: string, otp: string): boolean {
  const rec = store.get(email.toLowerCase())
  if (!rec) return false
  if (Date.now() > rec.expiry) { store.delete(email.toLowerCase()); return false }
  if (rec.otp !== otp) return false
  store.delete(email.toLowerCase())
  return true
}

// Short-lived reset token issued after OTP verification
interface ResetTokenRecord {
  email: string
  expiry: number
}

const g2 = global as typeof global & { _adminResetTokens?: Map<string, ResetTokenRecord> }
if (!g2._adminResetTokens) g2._adminResetTokens = new Map<string, ResetTokenRecord>()
const resetTokens = g2._adminResetTokens

export function generateResetToken(email: string): string {
  const token = crypto.randomBytes(32).toString('hex')
  resetTokens.set(token, { email, expiry: Date.now() + 15 * 60 * 1000 })
  return token
}

export function consumeResetToken(token: string): string | null {
  const rec = resetTokens.get(token)
  if (!rec) return null
  if (Date.now() > rec.expiry) { resetTokens.delete(token); return null }
  resetTokens.delete(token)
  return rec.email
}
