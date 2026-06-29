import { createClient } from '@/lib/supabase/server'
import { Shield } from 'lucide-react'

export const metadata = { title: 'Admin Dashboard' }

export default async function AdminDashboard() {
  let orgCount = 0, userCount = 0, propCount = 0
  let errorMsg = ''

  try {
    const supabase = await createClient()
    const [orgs, users, props] = await Promise.all([
      supabase.from('organizations').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('properties').select('*', { count: 'exact', head: true }),
    ])
    orgCount = orgs.count ?? 0
    userCount = users.count ?? 0
    propCount = props.count ?? 0
    if (orgs.error) errorMsg += 'orgs: ' + orgs.error.message + ' | '
    if (users.error) errorMsg += 'users: ' + users.error.message + ' | '
    if (props.error) errorMsg += 'props: ' + props.error.message
  } catch (e: unknown) {
    errorMsg = e instanceof Error ? e.message : String(e)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield size={28} className="text-navy-700" />
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Platform Overview</h2>
          <p className="text-slate-500 text-sm">GetSuitel admin dashboard</p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          <strong>DB Error:</strong> {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="text-3xl font-bold text-slate-900">{orgCount}</div>
          <div className="text-slate-500 mt-1">Organizations</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="text-3xl font-bold text-slate-900">{userCount}</div>
          <div className="text-slate-500 mt-1">Total Users</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="text-3xl font-bold text-slate-900">{propCount}</div>
          <div className="text-slate-500 mt-1">Properties</div>
        </div>
      </div>
    </div>
  )
}
