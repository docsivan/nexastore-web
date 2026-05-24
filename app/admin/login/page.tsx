'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // Already authed? Skip the form
  useEffect(() => {
    fetch('/api/admin/verify').then(r => {
      if (r.ok) router.replace('/admin')
    }).catch(() => {})
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Invalid credentials')
        return
      }
      router.replace('/admin')
    } catch {
      setError('Connection error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-heading font-bold text-2xl text-primary">
            NexaStore
          </Link>
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-body font-semibold px-3 py-1.5 rounded-full mt-3 mx-auto">
            Staff Admin
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-body font-medium text-primary-dark mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="you@example.com"
                required
                autoFocus
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-body font-medium text-primary-dark mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="••••••••"
                required
                className="input-field w-full"
              />
            </div>

            {error && (
              <p className="text-sm font-body text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              className="btn-primary w-full py-3 disabled:opacity-40"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs font-body text-slate-muted">
            <Link href="/admin/forgot-password" className="hover:text-primary transition-colors">
              Forgot password?
            </Link>
          </p>
        </div>

        <p className="text-center text-xs font-body text-slate-muted mt-6">
          <Link href="/" className="hover:text-primary transition-colors">
            ← Back to store
          </Link>
        </p>
      </div>
    </main>
  )
}
