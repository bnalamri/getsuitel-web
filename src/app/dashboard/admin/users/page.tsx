import { createAdminClient } from '@/lib/supabase/server'
import { ShieldOff } from 'lucide-react'
import { unstable_noStore as noStore } from 'next/cache'
import { UsersTable } from './UsersTable'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'User Management' }

const roleColor: Record<string, string> = {
  owner:            'bg-navy-100 text-navy-700',
  tenant:           'bg-emerald-100 text-emerald-700',
  technician:       'bg-orange-100 text-orange-700',
  property_manager: 'bg-teal-100 text-teal-700',
  financial_manager:'bg-purple-100 text-purple-700',
}

export default async function UsersPage() {
  noStore()
  const admin = createAdminClient()

  // Fetch all profiles with org name
  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('id, full_name, email, phone, role, organization_id, created_at, organizations!organization_id(name)')
    .neq('role', 'superadmin')
    .order('created_at', { ascending: false })

  if (profilesError) console.error('Users page profiles error:', profilesError)

  // Fetch banned users from auth (defensive — listUsers can fail)
  let bannedIds: string[] = []
  try {
    const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
    bannedIds = (authData?.users ?? [])
      .filter(u => u.banned_until && new Date(u.banned_until) > new Date())
      .map(u => u.id)
  } catch { /* non-fatal — status column will show Active for all */ }

  const list = (profiles ?? []) as any[]
  const banned = new Set(bannedIds)

  const byRole = list.reduce((acc: Record<string, number>, p) => {
    acc[p.role] = (acc[p.role] ?? 0) + 1; return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
        <p className="text-slate-500 text-sm mt-0.5">{list.length} users across all organizations</p>
      </div>

      {/* Role summary chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(byRole).map(([role, count]) => (
          <span key={role} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${roleColor[role] ?? 'bg-slate-100 text-slate-600'}`}>
            {role.replace('_', ' ')} <span className="font-black">{count}</span>
          </span>
        ))}
        {bannedIds.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            <ShieldOff size={11}/> disabled <span className="font-black">{bannedIds.length}</span>
          </span>
        )}
      </div>

      {/* Filters + Table (client component) */}
      <UsersTable list={list} bannedIds={bannedIds} />
    </div>
  )
}
