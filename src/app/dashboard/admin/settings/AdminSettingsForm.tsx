'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Save, Shield } from 'lucide-react'

export default function AdminSettingsForm({ profile }: { profile: Record<string, unknown> | null }) {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const [fullName, setFullName] = useState((profile?.full_name as string) ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', profile?.id as string)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={16} className="text-navy-700" />
        <h3 className="font-semibold text-slate-900">Admin Profile</h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="label">Full Name</label><input className="input" value={fullName} onChange={e => setFullName(e.target.value)} /></div>
        <div><label className="label">Email</label><input className="input bg-slate-50 text-slate-400 cursor-not-allowed" value={profile?.email as string} disabled /></div>
        <div><label className="label">Role</label><input className="input bg-slate-50 text-slate-400 cursor-not-allowed" value="Superadmin" disabled /></div>
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
