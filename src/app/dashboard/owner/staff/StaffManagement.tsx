'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Loader2, X, Mail, Clock, Shield, TrendingUp, Trash2 } from 'lucide-react'

type StaffMember = { id: string; full_name: string | null; email: string | null; role: string; created_at: string }
type Invitation = { id: string; email: string; role: string; expires_at: string; created_at: string }

function roleLabel(role: string) {
  return role === 'property_manager' ? 'Property Manager' : 'Financial Manager'
}
function roleIcon(role: string) {
  return role === 'property_manager' ? Shield : TrendingUp
}
function roleColor(role: string) {
  return role === 'property_manager'
    ? 'bg-teal-100 text-teal-700'
    : 'bg-purple-100 text-purple-700'
}

export default function StaffManagement({
  staff, invitations, orgId,
}: {
  staff: StaffMember[]
  invitations: Invitation[]
  orgId: string
}) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'property_manager' | 'financial_manager'>('property_manager')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deactivating, setDeactivating] = useState<string | null>(null)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    const res = await fetch('/api/owner/staff/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), role }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Failed to send invitation'); return }
    setSuccess(`Invitation sent to ${email}`)
    setEmail(''); setShowModal(false)
    router.refresh()
  }

  async function handleDeactivate(staffId: string, name: string | null) {
    if (!confirm(`Remove ${name || 'this staff member'} from your organization? They will lose access immediately.`)) return
    setDeactivating(staffId)
    const res = await fetch('/api/owner/staff/deactivate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId }),
    })
    setDeactivating(null)
    if (res.ok) router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">{staff.length} active staff member{staff.length !== 1 ? 's' : ''}</div>
        <button onClick={() => { setShowModal(true); setError(''); setSuccess('') }}
          className="btn-primary flex items-center gap-2 text-sm">
          <UserPlus size={15}/> Invite Staff
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <span>✓</span> {success}
        </div>
      )}

      {/* Active staff */}
      <div className="card">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Active Staff</h3>
        </div>
        {staff.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-400 text-sm">
            No staff members yet. Invite a Property Manager or Financial Manager.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {staff.map(s => {
              const Icon = roleIcon(s.role)
              return (
                <div key={s.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-semibold text-slate-600 flex-shrink-0">
                    {s.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 text-sm">{s.full_name || '—'}</div>
                    <div className="text-xs text-slate-400">{s.email}</div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${roleColor(s.role)}`}>
                    <Icon size={11}/> {roleLabel(s.role)}
                  </span>
                  <button
                    onClick={() => handleDeactivate(s.id, s.full_name)}
                    disabled={deactivating === s.id}
                    className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                    title="Remove staff member">
                    {deactivating === s.id ? <Loader2 size={15} className="animate-spin"/> : <Trash2 size={15}/>}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Pending Invitations</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {invitations.map(inv => (
              <div key={inv.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                  <Mail size={15} className="text-amber-500"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-700 text-sm">{inv.email}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock size={10}/>
                    Expires {new Date(inv.expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${roleColor(inv.role)}`}>
                  {roleLabel(inv.role)}
                </span>
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">Invite Staff Member</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20}/>
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  required
                  className="input"
                  placeholder="staff@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Role</label>
                <div className="space-y-2">
                  {(['property_manager', 'financial_manager'] as const).map(r => {
                    const Icon = roleIcon(r)
                    return (
                      <button key={r} type="button" onClick={() => setRole(r)}
                        className={`w-full text-start p-3.5 rounded-xl border-2 transition-all flex items-start gap-3 ${role === r ? 'border-navy-700 bg-navy-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <Icon size={18} className={role === r ? 'text-navy-700 mt-0.5' : 'text-slate-400 mt-0.5'}/>
                        <div>
                          <div className="font-semibold text-sm text-slate-900">{roleLabel(r)}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {r === 'property_manager'
                              ? 'Properties, units, tenants, contracts, maintenance, notices'
                              : 'Invoices, payments, financial reports, statements'}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">{error}</div>}
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <Loader2 size={16} className="animate-spin"/> : <Mail size={16}/>}
                {loading ? 'Sending…' : 'Send Invitation'}
              </button>
              <p className="text-xs text-slate-400 text-center">An invitation email with a registration link will be sent. It expires in 7 days.</p>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
