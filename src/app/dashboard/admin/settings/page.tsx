import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Building2 } from 'lucide-react'
import AdminSettingsForm from './AdminSettingsForm'

export const metadata = { title: 'Admin Settings' }

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: branch }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('branches').select('id, display_name, city, region, status').eq('superadmin_id', user.id).single(),
  ])

  const branchLabel = branch?.display_name
    ? `GetSuitel — ${branch.display_name} Branch`
    : (profile?.branch_name as string | null) ?? 'Not assigned'

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-2xl font-bold text-slate-900">Settings</h2>

      {/* Branch assignment card — read-only */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={16} className="text-navy-700" />
          <h3 className="font-semibold text-slate-800 text-sm">Branch Assignment</h3>
        </div>
        <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center flex-shrink-0">
            <Building2 size={15} className="text-navy-700" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">{branchLabel}</p>
            {branch && (
              <p className="text-xs text-slate-500 mt-0.5">
                {[branch.city, branch.region].filter(Boolean).join(', ')}
                {branch.status && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    branch.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>{branch.status}</span>
                )}
              </p>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2">Branch assignment is managed by HQ. Contact your HQ administrator to change this.</p>
      </div>

      <AdminSettingsForm profile={profile} branchDisplayName={branch?.display_name ?? null} />
    </div>
  )
}
