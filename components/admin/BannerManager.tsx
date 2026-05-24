'use client'

import { useState, useEffect } from 'react'

interface Banner {
  id: string
  title: string
  subtitle: string
  cta_text: string
  cta_url: string
  is_active: boolean
  display_order: number
}

interface Props {
}

const EMPTY_FORM = { title: '', subtitle: '', cta_text: '', cta_url: '', is_active: true, display_order: 1 }

export default function BannerManager({}: Props) {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Banner | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetch('/api/admin/banners', { headers: {} })
      .then(r => r.json())
      .then(d => setBanners(d.banners ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      if (editing) {
        await fetch('/api/admin/banners', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json',},
          body: JSON.stringify({ id: editing.id, ...form }),
        })
        setBanners(prev => prev.map(b => b.id === editing.id ? { ...b, ...form } : b))
      } else {
        const res = await fetch('/api/admin/banners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json',},
          body: JSON.stringify(form),
        })
        const newBanner = await res.json()
        if (newBanner.id) setBanners(prev => [...prev, newBanner])
      }
      setEditing(null); setForm(EMPTY_FORM); setShowForm(false)
    } catch {} finally {
      setSaving(false)
    }
  }

  const deleteBanner = async (id: string) => {
    try {
      await fetch('/api/admin/banners', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json',},
        body: JSON.stringify({ id }),
      })
      setBanners(prev => prev.filter(b => b.id !== id))
    } catch {}
  }

  const toggleActive = async (banner: Banner) => {
    try {
      await fetch('/api/admin/banners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json',},
        body: JSON.stringify({ id: banner.id, is_active: !banner.is_active }),
      })
      setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, is_active: !b.is_active } : b))
    } catch {}
  }

  if (loading) return <div className="h-40 animate-pulse bg-gray-100 rounded-xl" />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }}
          className="btn-primary text-sm px-4 py-2"
        >
          + Add Banner
        </button>
      </div>

      {(showForm || editing) && (
        <div className="bg-white rounded-xl border border-border p-5 space-y-3">
          <h4 className="font-heading font-semibold text-sm text-primary-dark">{editing ? 'Edit Banner' : 'New Banner'}</h4>
          {[
            { key: 'title', label: 'Title', placeholder: 'e.g. Premium Healthcare Supplies' },
            { key: 'subtitle', label: 'Subtitle', placeholder: 'e.g. Delivered Same Day in Muscat' },
            { key: 'cta_text', label: 'Button Text', placeholder: 'e.g. Shop Now' },
            { key: 'cta_url', label: 'Button URL', placeholder: 'e.g. /products' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block font-body text-xs text-slate-muted mb-1">{label}</label>
              <input
                type="text"
                value={form[key as keyof typeof form] as string}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                className="input-field w-full text-sm py-1.5"
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs text-slate-muted mb-1">Display Order</label>
              <input type="number" min={1}
                value={form.display_order}
                onChange={e => setForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 1 }))}
                className="input-field w-full text-sm py-1.5"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active}
                  onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="accent-primary" />
                <span className="font-body text-sm text-slate">Active</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving || !form.title}
              className="btn-primary text-sm px-4 py-2 disabled:opacity-40">
              {saving ? 'Saving…' : 'Save Banner'}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM) }}
              className="text-sm font-body text-slate-muted hover:text-slate transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {banners.length === 0 && (
          <p className="font-body text-sm text-slate-muted text-center py-8">No banners yet. Add one above.</p>
        )}
        {banners.map(b => (
          <div key={b.id} className="bg-white rounded-xl border border-border p-4 flex items-center gap-3 flex-wrap">
            <span className="font-body text-xs text-slate-muted w-6 text-center">{b.display_order}</span>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-semibold text-sm text-primary-dark">{b.title}</p>
              {b.subtitle && <p className="font-body text-xs text-slate-muted">{b.subtitle}</p>}
              <p className="font-body text-xs text-slate-muted">{b.cta_text} → {b.cta_url}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => toggleActive(b)}
                className={`text-xs px-2 py-1 rounded-full font-body border transition-colors ${b.is_active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                {b.is_active ? 'Active' : 'Inactive'}
              </button>
              <button onClick={() => { setEditing(b); setForm({ title: b.title, subtitle: b.subtitle, cta_text: b.cta_text, cta_url: b.cta_url, is_active: b.is_active, display_order: b.display_order }); setShowForm(false) }}
                className="text-xs text-primary hover:underline font-body">Edit</button>
              <button onClick={() => deleteBanner(b.id)}
                className="text-xs text-red-500 hover:text-red-700 font-body">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
