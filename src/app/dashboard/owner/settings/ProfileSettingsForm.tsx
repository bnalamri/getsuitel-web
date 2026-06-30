'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Save } from 'lucide-react'

export default function ProfileSettingsForm({ profile }: { profile: Record<string, unknown> | null }) {
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
        <div><label className="label">Email</label><input className="input" value={profile?.email as string} disabled className="input bg-slate-50 text-slate-400 cursor-not-allowed" /></div>
        <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+968 9000 0000" /></div>
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saved ? 'Saved!' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}
