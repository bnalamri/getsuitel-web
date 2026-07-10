'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Save } from 'lucide-react'
import PhoneInput from '@/components/PhoneInput'

export default function TechSettingsForm({ profile }: { profile: Record<string, unknown> | null }) {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const [form, setForm] = useState({
    full_name: (profile?.full_name as string) ?? '',
    phone: (profile?.phone as string) ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.from('profiles').update(form).eq('id', profile?.id as string)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-slate-900 mb-4">Profile</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="label">Full Name</label><input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
        <div><label className="label">Email</label><input className="input bg-slate-50 text-slate-400 cursor-not-allowed" value={profile?.email as string} disabled /></div>
        <div><label className="label">Phone</label><PhoneInput value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} /></div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
          Role: <strong>Technician</strong> — assigned by your organization admin.
        </div>
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
