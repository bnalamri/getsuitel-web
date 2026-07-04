import { createClient, createAdminClient } from '@/lib/supabase/server'
import { HardHat, Mail, Phone } from 'lucide-react'

export const metadata = { title: 'Team' }

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id

  const admin = createAdminClient()
  const { data: team } = await admin.from('profiles').select('*').eq('organization_id', orgId ?? '').eq('role', 'technician').order('full_name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Team</h2>
          <p className="text-slate-500 text-sm mt-0.5">{team?.length ?? 0} technicians</p>
        </div>
      </div>

      {team?.length === 0 ? (
        <div className="card p-16 text-center">
          <HardHat size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700 mb-1">No technicians yet</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">Technicians can sign up and be linked to your organization. Ask them to register at <strong>getsuitel.com</strong>.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {team?.map(t => (
            <div key={t.id} className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
                  {t.full_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{t.full_name}</div>
                  <div className="text-xs text-slate-400 capitalize">{t.role}</div>
                </div>
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <div className="flex items-center gap-2"><Mail size={13} className="text-slate-400" />{t.email}</div>
                {t.phone && <div className="flex items-center gap-2"><Phone size={13} className="text-slate-400" />{t.phone}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
