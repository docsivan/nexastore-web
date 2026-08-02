'use client'

import { useState } from 'react'

const STEPS = [
  { id: 1, title: 'What do you sell?', icon: '🏪' },
  { id: 2, title: 'Your brand', icon: '✨' },
  { id: 3, title: 'Your location', icon: '🌍' },
  { id: 4, title: 'Your details', icon: '👤' },
  { id: 5, title: 'Choose your plan', icon: '🚀' },
]

const INDUSTRIES = [
  { id: 'healthcare', label: 'Healthcare & Medical', emoji: '🏥' },
  { id: 'beauty', label: 'Beauty & Cosmetics', emoji: '💄' },
  { id: 'food', label: 'Food & Beverage', emoji: '🍽️' },
  { id: 'electronics', label: 'Electronics', emoji: '⚡' },
  { id: 'fashion', label: 'Fashion & Apparel', emoji: '👗' },
  { id: 'general', label: 'General Trading', emoji: '📦' },
]

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$49/month',
    features: ['Online Store', 'AI Assistant', 'Up to 500 products', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$99/month',
    features: ['Everything in Starter', 'Full ERP', 'Accounting & HR', 'Priority support'],
    recommended: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    features: ['Everything in Pro', 'Custom domain', 'Dedicated support', 'Custom integrations'],
  },
]

export default function SetupPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    industry: '',
    business_name: '',
    name: '',
    email: '',
    phone: '',
    country: 'Oman',
    currency: 'USD',
    plan: 'pro',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const next = () => setStep((s) => Math.min(s + 1, 5))
  const back = () => setStep((s) => Math.max(s - 1, 1))

  const submit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Your business is coming alive
          </h1>
          <p className="text-slate-300 mb-2">
            We are setting up your complete Zevio stack.
          </p>
          <p className="text-slate-300 mb-8">
            Check your email at <strong className="text-white">{form.email}</strong> —
            your store will be ready in about 10 minutes.
          </p>
          <div className="bg-slate-700 rounded-2xl p-6 text-left space-y-3">
            <p className="text-slate-300 text-sm">✅ Your store is being created</p>
            <p className="text-slate-300 text-sm">✅ Your ERP is being configured</p>
            <p className="text-slate-300 text-sm">✅ Your AI assistant is being trained</p>
            <p className="text-slate-300 text-sm">⏳ Welcome email on its way...</p>
          </div>
          <p className="text-slate-500 text-xs mt-8">
            Powered by Zevio · Your business, alive.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Zevio</h1>
          <p className="text-slate-400 text-sm">Your business, alive.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === s.id
                  ? 'bg-indigo-500 text-white scale-110'
                  : step > s.id
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {step > s.id ? '✓' : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-full mx-1 transition-all ${
                  step > s.id ? 'bg-green-500' : 'bg-slate-700'
                }`} style={{ width: '40px' }} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700">

          {/* Step 1 — Industry */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-2">What do you sell?</h2>
              <p className="text-slate-400 text-sm mb-6">
                We will configure your store for your industry.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind.id}
                    onClick={() => { update('industry', ind.id); next() }}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      form.industry === ind.id
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-slate-600 hover:border-slate-500 bg-slate-700/50'
                    }`}
                  >
                    <div className="text-2xl mb-2">{ind.emoji}</div>
                    <div className="text-white text-sm font-medium">{ind.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Brand */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Your brand</h2>
              <p className="text-slate-400 text-sm mb-6">
                What is your business called?
              </p>
              <input
                type="text"
                placeholder="Business name"
                value={form.business_name}
                onChange={(e) => update('business_name', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 mb-3"
              />
              <p className="text-slate-500 text-xs mb-6">
                Your store will be available at: {form.business_name
                  ? `${form.business_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.zevio.io`
                  : 'yourname.zevio.io'}
              </p>
            </div>
          )}

          {/* Step 3 — Location */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Your location</h2>
              <p className="text-slate-400 text-sm mb-6">
                We will configure tax rates and currency for your region.
              </p>
              <select
                value={form.country}
                onChange={(e) => update('country', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 mb-3"
              >
                <option value="Oman">🇴🇲 Oman</option>
                <option value="UAE">🇦🇪 UAE</option>
                <option value="Saudi Arabia">🇸🇦 Saudi Arabia</option>
                <option value="Kuwait">🇰🇼 Kuwait</option>
                <option value="Bahrain">🇧🇭 Bahrain</option>
                <option value="Qatar">🇶🇦 Qatar</option>
                <option value="India">🇮🇳 India</option>
                <option value="Other">🌍 Other</option>
              </select>
              <select
                value={form.currency}
                onChange={(e) => update('currency', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="OMR">OMR — Omani Rial</option>
                <option value="AED">AED — UAE Dirham</option>
                <option value="SAR">SAR — Saudi Riyal</option>
                <option value="USD">USD — US Dollar</option>
                <option value="INR">INR — Indian Rupee</option>
              </select>
            </div>
          )}

          {/* Step 4 — Details */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Your details</h2>
              <p className="text-slate-400 text-sm mb-6">
                We will send your store credentials here.
              </p>
              <input
                type="text"
                placeholder="Your name"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 mb-3"
              />
              <input
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 mb-3"
              />
              <input
                type="tel"
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Step 5 — Plan */}
          {step === 5 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Choose your plan</h2>
              <p className="text-slate-400 text-sm mb-6">
                Start free for 14 days. No credit card required.
              </p>
              <div className="space-y-3">
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => update('plan', plan.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all ${
                      form.plan === plan.id
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-slate-600 hover:border-slate-500 bg-slate-700/50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-white font-semibold flex items-center gap-2">
                          {plan.name}
                          {plan.recommended && (
                            <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full">
                              Recommended
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-xs mt-1">
                          {plan.features.slice(0, 2).join(' · ')}
                        </div>
                      </div>
                      <div className="text-indigo-400 font-bold text-sm">{plan.price}</div>
                    </div>
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-red-400 text-sm mt-4">{error}</p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <button
                onClick={back}
                className="text-slate-400 hover:text-white transition-colors text-sm"
              >
                ← Back
              </button>
            ) : <div />}

            {step < 5 ? (
              <button
                onClick={next}
                disabled={
                  (step === 1 && !form.industry) ||
                  (step === 2 && !form.business_name) ||
                  (step === 4 && (!form.name || !form.email))
                }
                className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-all text-sm"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={submitting}
                className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white font-semibold px-8 py-2.5 rounded-xl transition-all text-sm"
              >
                {submitting ? 'Setting up your business...' : 'Launch my business 🚀'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Zevio · Your business, alive. · By signing up you agree to our terms.
        </p>
      </div>
    </div>
  )
}
