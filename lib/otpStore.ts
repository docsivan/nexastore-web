export type OtpRecord = {
  otp: string
  expiry: number
  customer_name: string
  email: string
  customer_id: string
  clinic_name: string
  city: string
}

// Global singleton — survives Next.js hot reloads in development
// In production (Vercel) modules don't hot-reload so this is a no-op
const g = global as typeof global & { _otpStore?: Map<string, OtpRecord> }
if (!g._otpStore) g._otpStore = new Map<string, OtpRecord>()
export const otpStore = g._otpStore
