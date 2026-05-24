'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface AdminUser {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'staff'
  is_active: boolean
  must_change_password?: boolean
  created_at: string
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin:       'bg-blue-100 text-blue-700',
  staff:       'bg-slate-100 text-slate-600',
}

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}

export default function UsersPage() {
  const [users, setUsers]           = useState<AdminUser[]>([])
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [addName, setAddName]       = useState('')
  const [addEmail, setAddEmail]     = useState('')
  const [addRole, setAddRole]       = useState<'admin' | 'staff'>('staff')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError]     = useState('')
  const [actionError, setActionError] = useState('')
  const [resetting, setResetting]   = useState<string | null>(null)
  const [deactivating, setDeactivating] = useState<string | null>(null)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) { const d = await res.json(); setUsers(d.users ?? []) }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddLoading(true); setAddError('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName, email: addEmail, role: addRole }),
      })
      const d = await res.json()
      if (!res.ok) { setAddError(d.error ?? 'Failed to create user'); return }
      setShowAdd(false); setAddName(''); setAddEmail(''); setAddRole('staff')
      loadUsers()
    } catch { setAddError('Connection error. Try again.') }
    finally { setAddLoading(false) }
  }

  const handleResetPassword = async (email: string) => {
    if (!confirm(`Reset password for ${email}? A new temporary password will be emailed to them.`)) return
    setResetting(email); setActionError('')
    try {
      const res = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const d = await res.json()
      if (!res.ok) { setActionError(d.error ?? 'Failed to reset password'); return }
      alert('Password reset — new temp password emailed.')
    } catch { setActionError('Connection error.') }
    finally { setResetting(null) }
  }

  const handleDeactivate = async (email: string) => {
    if (!confirm(`Deactivate ${email}? They will no longer be able to log in.`)) return
    setDeactivating(email); setActionError('')
    try {
      const res = await fetch(`/api/admin/users?email=${encodeURIComponent(email)}`, { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) { setActionError(d.error ?? 'Failed to deactivate'); return }
      loadUsers()
    } catch { setActionError('Connection error.') }
    finally { setDeactivating(null) }
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="bg-primary text-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="font-heading font-bold text-lg text-white hover:text-white/90">NexaStore</Link>
            <span className="text-white/40">·</span>
            <span className="text-white/80 text-sm font-body">User Management</span>
          </div>
          <Link href="/admin" className="text-white/70 hover:text-white text-sm font-body transition-colors">← Admin Panel</Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading font-bold text-xl text-primary-dark">Admin Users</h1>
          <button onClick={() => setShowAdd(true)}
            className="btn-primary px-4 py-2 text-sm">
            + Add User
          </button>
        </div>

        {actionError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="font-body text-sm text-red-700">{actionError}</p>
          </div>
        )}

        {/* Add User Modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdd(false)} />
            <div className="relative bg-white rounded-2xl border border-border shadow-modal w-full max-w-md p-6 space-y-4">
              <h2 className="font-heading font-semibold text-primary-dark">Add Admin User</h2>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-body font-medium text-primary-dark mb-1.5">Name</label>
                  <input type="text" value={addName} onChange={e => setAddName(e.target.value)}
                    placeholder="Full name" required className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm font-body font-medium text-primary-dark mb-1.5">Email</label>
                  <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)}
                    placeholder="user@example.com" required className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm font-body font-medium text-primary-dark mb-1.5">Role</label>
                  <select value={addRole} onChange={e => setAddRole(e.target.value as 'admin' | 'staff')}
                    className="w-full text-sm font-body border border-border rounded-btn px-3 py-2 bg-white focus:border-primary outline-none">
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {addError && <p className="text-sm font-body text-red-600">{addError}</p>}
                <p className="text-xs font-body text-slate-muted">A welcome email with a temporary password will be sent automatically.</p>
                <div className="flex gap-3">
                  <button type="submit" disabled={addLoading}
                    className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-40">
                    {addLoading ? 'Creating...' : 'Create User'}
                  </button>
                  <button type="button" onClick={() => setShowAdd(false)}
                    className="flex-1 py-2.5 text-sm font-body border border-border rounded-btn hover:bg-surface transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-14 bg-surface rounded-xl" />)}
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-body text-slate-muted">No users found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Header */}
              <div className="grid grid-cols-12 px-5 py-3 bg-surface/50">
                <div className="col-span-3 text-xs font-body font-semibold text-slate-muted uppercase tracking-wide">Name</div>
                <div className="col-span-4 text-xs font-body font-semibold text-slate-muted uppercase tracking-wide">Email</div>
                <div className="col-span-2 text-xs font-body font-semibold text-slate-muted uppercase tracking-wide">Role</div>
                <div className="col-span-3 text-xs font-body font-semibold text-slate-muted uppercase tracking-wide text-right">Actions</div>
              </div>
              {users.map(user => (
                <div key={user.id} className="grid grid-cols-12 px-5 py-4 items-center hover:bg-surface/30 transition-colors">
                  <div className="col-span-3">
                    <p className="font-body text-sm font-medium text-primary-dark">{user.name}</p>
                    {!user.is_active && (
                      <span className="text-xs font-body text-red-500">Deactivated</span>
                    )}
                    {user.must_change_password && user.is_active && (
                      <span className="text-xs font-body text-amber-500">Must change password</span>
                    )}
                  </div>
                  <div className="col-span-4">
                    <p className="font-body text-sm text-slate">{user.email}</p>
                    <p className="font-body text-xs text-slate-muted">{fmtDate(user.created_at)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className={`text-xs font-body font-medium px-2 py-1 rounded-full ${ROLE_COLORS[user.role] ?? 'bg-slate-100 text-slate-600'}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="col-span-3 flex justify-end gap-2">
                    {user.role !== 'super_admin' && user.is_active && (
                      <>
                        <button
                          onClick={() => handleResetPassword(user.email)}
                          disabled={resetting === user.email}
                          className="text-xs font-body text-blue-600 hover:text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-40"
                        >
                          {resetting === user.email ? '...' : 'Reset PW'}
                        </button>
                        <button
                          onClick={() => handleDeactivate(user.email)}
                          disabled={deactivating === user.email}
                          className="text-xs font-body text-red-600 hover:text-red-700 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          {deactivating === user.email ? '...' : 'Deactivate'}
                        </button>
                      </>
                    )}
                    {user.role === 'super_admin' && (
                      <span className="text-xs font-body text-slate-muted italic">Protected</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
