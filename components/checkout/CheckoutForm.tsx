'use client'

import { useState, useEffect } from 'react'
import { CheckoutFormData } from '@/lib/types'
import { validateCheckoutForm, OMAN_GOVERNORATES } from '@/lib/validators'
import { useAuth } from '@/context/AuthContext'

interface Props {
  onSubmit: (data: CheckoutFormData) => void
  loading?: boolean
}

export default function CheckoutForm({ onSubmit, loading }: Props) {
  const { customer, isLoggedIn } = useAuth()
  const [useNewAddress, setUseNewAddress] = useState(false)
  const [form, setForm] = useState<Partial<CheckoutFormData>>({ country: 'Oman' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Pre-fill from profile
  useEffect(() => {
    if (isLoggedIn && customer) {
      const nameParts = (customer.customer_name ?? '').split(' ')
      setForm({
        country:     'Oman',
        firstName:   nameParts[0] ?? '',
        lastName:    nameParts.slice(1).join(' ') ?? '',
        email:       customer.email       ?? '',
        phone:       customer.phone       ?? '',
        company:     customer.clinic_name ?? '',
        address:     customer.address     ?? '',
        city:        customer.city        ?? '',
        governorate: 'Muscat',
      })
    }
  }, [isLoggedIn, customer])

  const set = (field: keyof CheckoutFormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = validateCheckoutForm(form)
    if (!result.valid) { setErrors(result.errors); return }
    setErrors({})
    onSubmit(form as CheckoutFormData)
  }

  const field = (
    name: keyof CheckoutFormData,
    label: string,
    type = 'text',
    required = true,
    placeholder = '',
    locked = false
  ) => (
    <div>
      <label className="block font-body text-xs font-semibold text-slate mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={(form[name] as string) ?? ''}
        onChange={e => !locked && set(name, e.target.value)}
        readOnly={locked}
        className={`input-field ${errors[name] ? 'border-red-400' : ''} ${locked ? 'bg-gray-50 text-gray-500 cursor-default' : ''}`}
        placeholder={locked ? '' : placeholder}
      />
      {errors[name] && <p className="mt-1 text-xs font-body text-red-500">{errors[name]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">

      {/* ── Contact (always locked for logged-in) ── */}
      <section>
        <h2 className="font-heading font-semibold text-lg text-primary-dark mb-4 pb-3 border-b border-border">
          Contact Information
        </h2>
        {isLoggedIn && customer ? (
          <div className="flex items-center gap-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {customer.customer_name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-primary-dark text-sm">{customer.customer_name}</p>
              <p className="text-xs text-slate mt-0.5">{customer.email}</p>
              <p className="text-xs text-slate">{customer.phone}</p>
            </div>
            <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full">✓ Verified</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('firstName', 'First Name',    'text',  true,  'Ahmed')}
            {field('lastName',  'Last Name',     'text',  true,  'Al-Rashdi')}
            {field('email',     'Email Address', 'email', true,  'ahmed@example.com')}
            {field('phone',     'Phone Number',  'tel',   true,  '+968 9XXX XXXX')}
            {field('company',   'Clinic / Facility', 'text', false, 'Clinic or Hospital name')}
            {field('vatNumber', 'VAT Number',    'text',  false, 'OM-XXXXXXX')}
          </div>
        )}
      </section>

      {/* ── Delivery Address ── */}
      <section>
        <h2 className="font-heading font-semibold text-lg text-primary-dark mb-4 pb-3 border-b border-border">
          Delivery Address
        </h2>

        {isLoggedIn && customer && !useNewAddress ? (
          /* ── Saved address confirmation card ── */
          <div className="flex flex-col gap-4">
            <div className="border-2 border-primary rounded-xl p-5 bg-blue-50/40">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                      Delivering to
                    </p>
                    <p className="font-semibold text-primary-dark text-sm">{customer.customer_name}</p>
                    <p className="text-sm text-slate mt-0.5">{customer.address}</p>
                    <p className="text-sm text-slate">{customer.city}, Oman</p>
                  </div>
                </div>
                <span className="flex-shrink-0 bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  ✓ Default
                </span>
              </div>
            </div>

            {/* New address button */}
            <button
              type="button"
              onClick={() => {
                setUseNewAddress(true)
                setForm(prev => ({ ...prev, address: '', city: '', governorate: '' }))
              }}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-primary hover:text-primary transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Deliver to a different address
            </button>
          </div>
        ) : (
          /* ── New address form ── */
          <div className="flex flex-col gap-4">

            {isLoggedIn && useNewAddress && (
              <button
                type="button"
                onClick={() => {
                  setUseNewAddress(false)
                  setForm(prev => ({
                    ...prev,
                    address:     customer?.address     ?? '',
                    city:        customer?.city        ?? '',
                    governorate: 'Muscat',
                  }))
                  setErrors({})
                }}
                className="flex items-center gap-2 text-sm text-primary hover:underline self-start">
                ← Use my default address
              </button>
            )}

            <div>
              <label className="block font-body text-xs font-semibold text-slate mb-1.5">
                Street Address <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.address ?? ''}
                onChange={e => set('address', e.target.value)}
                className={`input-field ${errors.address ? 'border-red-400' : ''}`}
                placeholder="Building, street, area"
              />
              {errors.address && <p className="mt-1 text-xs text-red-500 font-body">{errors.address}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-body text-xs font-semibold text-slate mb-1.5">
                  City <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.city ?? ''}
                  onChange={e => set('city', e.target.value)}
                  className={`input-field ${errors.city ? 'border-red-400' : ''}`}
                  placeholder="Muscat"
                />
                {errors.city && <p className="mt-1 text-xs text-red-500 font-body">{errors.city}</p>}
              </div>
              <div>
                <label className="block font-body text-xs font-semibold text-slate mb-1.5">
                  Governorate <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.governorate ?? ''}
                  onChange={e => set('governorate', e.target.value)}
                  className={`input-field ${errors.governorate ? 'border-red-400' : ''}`}>
                  <option value="">Select governorate</option>
                  {OMAN_GOVERNORATES.map(gov => (
                    <option key={gov} value={gov}>{gov}</option>
                  ))}
                </select>
                {errors.governorate && (
                  <p className="mt-1 text-xs text-red-500 font-body">{errors.governorate}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Order notes — always shown */}
        <div className="mt-4">
          <label className="block font-body text-xs font-semibold text-slate mb-1.5">
            Order Notes <span className="text-slate-muted font-normal">(Optional)</span>
          </label>
          <textarea
            value={form.notes ?? ''}
            onChange={e => set('notes', e.target.value)}
            rows={3}
            className="input-field resize-none"
            placeholder="Delivery instructions, landmark, preferred delivery time…"
          />
        </div>
      </section>

      <button
        type="submit"
        disabled={loading}
        className="btn-accent w-full py-3.5 text-sm flex items-center justify-center gap-2">
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            Pay Now via PayTabs
          </>
        )}
      </button>
    </form>
  )
}
