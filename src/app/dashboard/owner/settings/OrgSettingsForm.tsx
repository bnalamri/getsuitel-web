'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Save } from 'lucide-react'

export default function OrgSettingsForm({ org, userId, orgId }: { org: Record<string, unknown> | null; userId: string; orgId: string | null }) {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const [form, setForm] = useState({ name: (org?.name as string) ?? '', name_ar: (org?.name_ar as string) ?? '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    if (orgId) {
      await supabase.from('organizations').update(form).eq('id', orgId)
    } else {
      const { data } = await supabase.from('organizations').insert({ ...form, owner_id: userId }).select('id').single()
      if (data?.id) await supabase.from('profiles').update({ organization_id: data.id }).eq('id', userId)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-slate-900 mb-1">Organization</h3>
      <p className="text-slate-500 text-sm mb-4">{orgId ? 'Update your company details' : 'Set up your organization to start managing properties'}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="label">Company Name (English)</label><input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Al Noor Properties LLC" /></div>
        <div><label className="label">Company Name (Arabic)</label><input className="input" dir="rtl" value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} placeholder="شركة النور للعقارات" /></div>
        {org && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500">Plan</div><div className="font-semibold capitalize text-slate-900 mt-0.5">{org.subscription_plan as string}</div></div>
            <div className="bg-slate-50 rounded-lg p-3"><div className="text-slate-500">Status</div><div className="font-semibold capitalize text-slate-900 mt-0.5">{org.subscription_status as string}</div></div>
          </div>
        )}
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saved ? 'Saved!' : orgId ? 'Save Changes' : 'Create Organization'}
        </button>
      </form>
    </div>
  )
}
