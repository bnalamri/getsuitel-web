'use client'
import { useEffect, useState } from 'react'
import { Users, UserPlus, Trash2, Loader2, Shield, UserCheck, Mail, Clock } from 'lucide-react'

type HQUser = {
  id: string
  full_name: string | null
  email: string
  phone?: string | null
  role: 'hq_admin' | 'hq_staff' | 'hq_finance'
  created_at: string
  avatar_url?: string | null
}

type Invitation = {
  id: string
  email: string
  created_at: string
  expires_at: string
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'hq_admin') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
      <Shield className="w-3 h-3" /> HQ Admin
    </span>
  )
  if (role === 'hq_finance') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
      <UserCheck className="w-3 h-3" /> HQ Finance
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
      <UserCheck className="w-3 h-3" /> HQ Staff
    </span>
  )
}

export default function HQUsersPage() {
  const [users, setUsers] = useState<HQUser[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [currentRole, setCurrentRole] = useState<string>('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'hq_staff' | 'hq_finance'>('hq_staff')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      // Get current user role
      const meRes = await fetch('/api/hq/config')
      // Determine current role from the users list after load
      const res = await fetch('/api/hq/team')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users ?? [])
        setInvitations(data.invitations ?? [])
      }
      // Get current user
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setCurrentRole(profile?.role ?? '')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg(null)
    try {
      const res = await fetch('/api/hq/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), invited_role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteMsg({ ok: false, text: data.error || 'Failed to send invitation' })
      } else {
        setInviteMsg({ ok: true, text: `Invitation sent to ${inviteEmail.trim()}` })
        setInviteEmail('')
        load()
      }
    } catch {
      setInviteMsg({ ok: false, text: 'Something went wrong' })
    } finally {
      setInviting(false)
    }
  }

  async function handleRevoke(userId: string) {
    if (!confirm('Remove this HQ staff member? They will lose access immediately.')) return
    setRevoking(userId)
    try {
      await fetch('/api/hq/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      load()
    } finally {
      setRevoking(null)
    }
  }

  async function handleCancelInvite(invitationId: string) {
    setRevoking(invitationId)
    try {
      await fetch('/api/hq/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }),
      })
      load()
    } finally {
      setRevoking(null)
    }
  }

  const isAdmin = currentRole === 'hq_admin'

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-yellow-600" /> HQ Team
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage who has access to the HQ platform</p>
        </div>
      </div>

      {/* Invite form — hq_admin only */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-yellow-600" /> Invite HQ Staff Member
          </h2>
          <form onSubmit={handleInvite} className="flex gap-3 flex-wrap">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              required
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as 'hq_staff' | 'hq_finance')}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
            >
              <option value="hq_staff">HQ Staff</option>
              <option value="hq_finance">HQ Finance</option>
            </select>
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg text-sm disabled:opacity-60 transition-colors"
            >
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Send Invite
            </button>
          </form>
          {inviteMsg && (
            <p className={`mt-2 text-sm px-3 py-2 rounded-lg ${inviteMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {inviteMsg.text}
            </p>
          )}
        </div>
      )}

      {/* Active users */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Active Members ({users.length})</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No HQ users found</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Role</th>
                <th className="text-left px-5 py-3">Phone</th>
                {isAdmin && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {u.full_name || '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{u.email}</td>
                  <td className="px-5 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-5 py-3 text-gray-500">
                    {u.phone || <span className="text-gray-300 italic text-xs">—</span>}
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-right">
                      {u.role !== 'hq_admin' && (
                        <button
                          onClick={() => handleRevoke(u.id)}
                          disabled={revoking === u.id}
                          className="text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
                          title="Remove access"
                        >
                          {revoking === u.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" /> Pending Invitations ({invitations.length})
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Sent</th>
                <th className="text-left px-5 py-3">Expires</th>
                {isAdmin && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invitations.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-700">{inv.email}</td>
                  <td className="px-5 py-3 text-gray-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-gray-500">{new Date(inv.expires_at).toLocaleDateString()}</td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleCancelInvite(inv.id)}
                        disabled={revoking === inv.id}
                        className="text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
                        title="Cancel invitation"
                      >
                        {revoking === inv.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
