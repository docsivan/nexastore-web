'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { setCustomerSession } from '@/lib/session'
import PasswordLoginTab from '@/components/auth/PasswordLoginTab'

type Step = 'phone' | 'otp'
type LoginTab = 'otp' | 'password'

export default function LoginPage() {
  const router = useRouter()
  const [loginTab, setLoginTab]   = useState<LoginTab>('otp')
  const [step, setStep]           = useState<Step>('phone')
  const [phone, setPhone]         = useState('')
  const [otp, setOtp]             = useState('')
  const [emailHint, setEmailHint] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [resendTimer, setResendTimer] = useState(0)

  const startResendTimer = () => {
    setResendTimer(30)
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const handleSendOtp = async () => {
    const cleaned = phone.trim().replace(/\s+/g, '')
    if (!cleaned) { setError('Please enter your phone number'); return }
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleaned }),
      })
      const data = await res.json()
      if (res.status === 404) {
        setError("No account found with this number. Place your first order to register automatically.")
        setLoading(false)
        return
      }
      if (!res.ok) {
        setError('Something went wrong. Please try again.')
        setLoading(false)
        return
      }
      setEmailHint(data.email_hint)
      setCustomerName(data.customer_name)
      setStep('otp')
      startResendTimer()
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 6) { setError('Please enter the 6-digit code'); return }
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), otp: otp.trim() }),
      })
      const data = await res.json()
      if (data.error === 'expired') {
        setError('Code expired. Please request a new one.')
        setLoading(false)
        return
      }
      if (data.error === 'invalid') {
        setError('Incorrect code. Please try again.')
        setLoading(false)
        return
      }
      if (!res.ok) {
        setError('Verification failed. Please try again.')
        setLoading(false)
        return
      }
      setCustomerSession({
        phone:         data.customer.phone,
        customer_name: data.customer.customer_name,
        clinic_name:   data.customer.clinic_name,
        customer_id:   data.customer.customer_id,
        city:          data.customer.city,
        email:         data.customer.email   ?? '',
        address:       data.customer.address ?? '',
      })
      router.push('/dashboard')
    } catch {
      setError('Connection error. Please try again.')
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    setOtp('')
    setError('')
    await handleSendOtp()
  }

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link href="/" className="font-heading font-bold text-2xl text-primary">NexaStore</Link>
          {loginTab === 'otp' && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className={`w-8 h-8 rounded-[3px] flex items-center justify-center text-sm font-heading font-bold ${step === 'phone' ? 'bg-primary text-white' : 'bg-accent text-white'}`}>
                {step === 'otp' ? '✓' : '1'}
              </div>
              <div className={`h-0.5 w-12 ${step === 'otp' ? 'bg-accent' : 'bg-border'}`} />
              <div className={`w-8 h-8 rounded-[3px] flex items-center justify-center text-sm font-heading font-bold ${step === 'otp' ? 'bg-primary text-white' : 'bg-border text-slate-muted'}`}>
                2
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-[4px] border border-border p-8">

          {/* Tab switcher */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setLoginTab('otp')}
              className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-colors ${loginTab === 'otp' ? 'bg-[#0D0D0D] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              OTP Login
            </button>
            <button
              onClick={() => setLoginTab('password')}
              className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-colors ${loginTab === 'password' ? 'bg-[#0D0D0D] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Password Login
            </button>
          </div>

          {loginTab === 'password' && <PasswordLoginTab />}

          {loginTab === 'otp' && step === 'phone' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-[3px] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h1 className="font-heading font-bold text-xl text-primary-dark">Welcome back</h1>
                <p className="font-body text-slate-muted text-sm mt-1">Enter your registered phone number to receive a verification code</p>
              </div>
              <div>
                <label className="block text-sm font-body font-medium text-primary-dark mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => { setPhone(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && !loading && phone.trim() && handleSendOtp()}
                  placeholder="+968 9XXX XXXX"
                  className="input-field w-full text-base"
                  autoFocus
                />
                {error && (
                  <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-[3px] px-3 py-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <p className="text-sm font-body text-red-600">{error}</p>
                  </div>
                )}
              </div>
              <button
                onClick={handleSendOtp}
                disabled={loading || !phone.trim()}
                className="btn-primary w-full py-3.5 text-base font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Sending code...
                  </span>
                ) : 'Send Verification Code →'}
              </button>
              <div className="pt-2 border-t border-border text-center">
                <p className="text-sm font-body text-slate-muted">
                  No account yet?{' '}
                  <Link href="/products" className="text-primary font-semibold hover:underline">Place your first order</Link>
                </p>
              </div>
            </div>
          )}

          {loginTab === 'otp' && step === 'otp' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 bg-accent/10 rounded-[3px] flex items-center justify-center mx-auto mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-accent">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/>
                  </svg>
                </div>
                <h1 className="font-heading font-bold text-xl text-primary-dark">Check your email</h1>
                <p className="font-body text-slate-muted text-sm mt-1">
                  Hi <strong>{customerName}</strong>! We sent a 6-digit code to <strong>{emailHint}</strong>
                </p>
                <p className="font-body text-slate-muted text-xs mt-1">Valid for 10 minutes</p>
              </div>
              <div>
                <label className="block text-sm font-body font-medium text-primary-dark mb-2">Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && !loading && otp.trim().length === 6 && handleVerifyOtp()}
                  placeholder="000000"
                  className="input-field w-full text-center text-2xl tracking-[0.4em] font-heading font-bold"
                  autoFocus
                />
                {error && (
                  <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-[3px] px-3 py-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <p className="text-sm font-body text-red-600">{error}</p>
                  </div>
                )}
              </div>
              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.trim().length !== 6}
                className="btn-primary w-full py-3.5 text-base font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Verifying...
                  </span>
                ) : 'Verify & Sign In →'}
              </button>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <button onClick={() => { setStep('phone'); setOtp(''); setError('') }}
                  className="text-sm font-body text-slate-muted hover:text-primary transition-colors">
                  Change number
                </button>
                <button onClick={handleResend} disabled={resendTimer > 0}
                  className="text-sm font-body text-primary hover:underline disabled:text-slate-muted disabled:no-underline transition-colors">
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-sm font-body text-slate-muted mt-4">
          New customer?{' '}
          <Link href="/register" className="text-primary font-semibold hover:underline">Create account</Link>
        </p>

        <p className="text-center text-xs font-body text-slate-muted mt-3">
          Need help?{' '}
          <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ""}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">WhatsApp us</a>
        </p>
      </div>
    </main>
  )
}
