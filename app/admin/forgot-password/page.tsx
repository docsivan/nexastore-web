'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Step = 'email' | 'otp' | 'password' | 'done'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep]         = useState<Step>('email')
  const [email, setEmail]       = useState('')
  const [otp, setOtp]           = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed to send OTP'); return }
      setStep('otp')
    } catch { setError('Connection error. Try again.') }
    finally { setLoading(false) }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Invalid OTP'); return }
      setResetToken(d.resetToken)
      setStep('password')
    } catch { setError('Connection error. Try again.') }
    finally { setLoading(false) }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Failed to reset password'); return }
      setStep('done')
      setTimeout(() => router.push('/admin'), 2000)
    } catch { setError('Connection error. Try again.') }
    finally { setLoading(false) }
  }

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-heading font-bold text-2xl text-primary">Hayat Supplies</Link>
          <p className="font-body text-sm text-slate-muted mt-2">Admin Password Reset</p>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-5">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-2">
            {(['email', 'otp', 'password'] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className={`w-6 h-px ${['otp','password','done'].includes(step) && i === 1 || ['password','done'].includes(step) && i === 2 ? 'bg-primary' : 'bg-border'}`} />}
                <div className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-body font-semibold transition-colors ${
                  step === s ? 'bg-primary text-white' :
                  (s === 'email' || (s === 'otp' && ['password','done'].includes(step))) ? 'bg-green-500 text-white' :
                  'bg-border text-slate-muted'
                }`}>{i + 1}</div>
              </div>
            ))}
          </div>

          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-body font-medium text-primary-dark mb-1.5">Your admin email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="input-field w-full"
                />
                <p className="mt-1.5 text-xs font-body text-slate-muted">A 6-digit OTP will be sent to all super admin emails.</p>
              </div>
              {error && <p className="text-sm font-body text-red-600">{error}</p>}
              <button type="submit" disabled={loading || !email.trim()}
                className="btn-primary w-full py-3 disabled:opacity-40">
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-body font-medium text-primary-dark mb-1.5">6-digit OTP</label>
                <input
                  type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" maxLength={6} required
                  className="input-field w-full text-center tracking-widest text-lg"
                  autoFocus
                />
                <p className="mt-1.5 text-xs font-body text-slate-muted">Check the super admin email inboxes. Valid for 15 minutes.</p>
              </div>
              {error && <p className="text-sm font-body text-red-600">{error}</p>}
              <button type="submit" disabled={loading || otp.length !== 6}
                className="btn-primary w-full py-3 disabled:opacity-40">
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button type="button" onClick={() => setStep('email')}
                className="w-full text-xs font-body text-slate-muted hover:text-slate transition-colors">
                ← Back
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-body font-medium text-primary-dark mb-1.5">New password</label>
                <input
                  type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters" required minLength={8}
                  className="input-field w-full"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-body font-medium text-primary-dark mb-1.5">Confirm password</label>
                <input
                  type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password" required
                  className="input-field w-full"
                />
              </div>
              {error && <p className="text-sm font-body text-red-600">{error}</p>}
              <button type="submit" disabled={loading || !newPassword || !confirmPassword}
                className="btn-primary w-full py-3 disabled:opacity-40">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-heading font-semibold text-primary-dark">Password reset!</p>
              <p className="font-body text-sm text-slate-muted">Redirecting to admin panel...</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs font-body text-slate-muted mt-6">
          <Link href="/admin" className="hover:text-primary transition-colors">← Back to admin login</Link>
        </p>
      </div>
    </main>
  )
}
