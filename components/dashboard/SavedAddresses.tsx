'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/ToastNotification'

interface Props {
  recordId: string
  address: string
  city: string
}

export default function SavedAddresses({ recordId, address: initAddress, city: initCity }: Props) {
  const { showToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [address, setAddress] = useState(initAddress)
  const [city, setCity] = useState(initCity)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/address', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_id: recordId, address, city }),
      })
      if (res.ok) {
        showToast('Address updated', 'success')
        setEditing(false)
      } else {
        showToast('Failed to update address', 'error')
      }
    } catch {
      showToast('Error saving address', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-sm text-primary-dark">Delivery Address</h3>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-xs font-body text-primary hover:text-primary-light transition-colors">
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="block font-body text-xs text-slate-muted mb-1">Street Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="input-field w-full text-sm"
              placeholder="Enter delivery address"
            />
          </div>
          <div>
            <label className="block font-body text-xs text-slate-muted mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input-field w-full text-sm"
              placeholder="e.g. Muscat"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-sm px-4 py-2 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setEditing(false); setAddress(initAddress); setCity(initCity) }}
              className="text-sm font-body text-slate-muted hover:text-slate transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {address || city ? (
            <>
              {address && <p className="font-body text-sm text-primary-dark">{address}</p>}
              {city && <p className="font-body text-sm text-slate-muted">{city}, Oman</p>}
            </>
          ) : (
            <p className="font-body text-sm text-slate-muted">No address saved yet</p>
          )}
        </div>
      )}
    </div>
  )
}
