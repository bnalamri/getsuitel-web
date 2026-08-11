'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Save, Mail } from 'lucide-react'
import PhoneInput from '@/components/PhoneInput'

export default function TenantSettingsForm({
  profile, tenant
}: { profile: Record<string, unknown> | null; tenant: Record<string, unknown> | null }) {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')
  const router = useRouter()
  const [form, setForm] = useState({
    full_name: (profile?.full_name as string) ?? '',
    phone: (tenant?.phone as string) ?? (profile?.phone as string) ?? '',
    emergency_contact: (tenant?.emergency_contact as string) ?? '',
    new_email: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await Promise.all([
      supabase.from('profiles').update({ full_name: form.full_name, phone: form.phone }).eq('id', profile?.id as string),
      tenant && supabase.from('tenants').update({ phone: form.phone, emergency_contact: form.emergency_contact }).eq('id', tenant.id as string),
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
    setLoading(false)
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault()
    const email = form.new_email.trim()
    if (!email || !email.includes('@')) { setEmailError('Enter a valid email address'); return }
    setEmailLoading(true)
    setEmailError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ email })
    if (error) { setEmailError(error.message); setEmailLoading(false); return }
    setEmailSent(true)
    setForm(f => ({ ...f, new_email: '' }))
    setEmailLoading(false)
  }

  return (
    <>
      {/* Profile */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Profile</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input bg-slate-50 text-slate-400 cursor-not-allowed" value={profile?.email as string} disabled />
          </div>
          <div>
            <label className="label">Phone</label>
            <PhoneInput value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
          </div>
          <div>
            <label className="label">Emergency Contact</label>
            <PhoneInput value={form.emergency_contact} onChange={v => setForm(f => ({ ...f, emergency_contact: v }))} placeholder="5XXXXXXXX" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change Email */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={16} className="text-navy-700" />
          <h3 className="font-semibold text-slate-900">Change Email</h3>
        </div>
        {emailSent ? (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
            Confirmation sent — check your new inbox and click the link to apply the change.
          </div>
        ) : (
          <form onSubmit={handleEmailChange} className="space-y-4">
            <div>
              <label className="label">New Email Address</label>
              <input
                className="input"
                type="email"
                placeholder="new@example.com"
                value={form.new_email}
                onChange={e => { setForm(f => ({ ...f, new_email: e.target.value })); setEmailError('') }}
              />
              {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
            </div>
            <button type="submit" disabled={emailLoading} className="btn-secondary flex items-center gap-2">
              {emailLoading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              Send Confirmation Email
            </button>
          </form>
        )}
      </div>
    </>
  )
}
