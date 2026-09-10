import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/layout/DashboardShell'
import DemoTourPanel from '@/components/demo/DemoTourPanel'
import { isFeatureEnabled, getEnabledFeatures } from '@/lib/featureFlags'
import { ShieldOff } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const isDemo = user.email === process.env.DEMO_EMAIL

  // Fetch profile and organization separately to avoid RLS join issues
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/logout')

  // tenant_portal is a master kill-switch (see task discussion 2026-09-10):
  // when off for a tenant's org, block access to the whole tenant dashboard
  // rather than just hiding individual features. Only ever checked for the
  // tenant role — owners/staff/technicians are unaffected by this flag.
  if (profile.role === 'tenant' && profile.organization_id) {
    const portalEnabled = await isFeatureEnabled('tenant_portal', profile.organization_id)
    if (!portalEnabled) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6">
              <ShieldOff size={28} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Portal Temporarily Unavailable</h1>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Online self-service has been temporarily turned off for your property. Please contact your property
              manager directly for contracts, invoices, or maintenance requests.
            </p>
            <Link href="/auth/logout" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
              Sign out
            </Link>
          </div>
        </div>
      )
    }
  }

  // Fetch org only if the user belongs to one
  let organization = null
  if (profile.organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.organization_id)
      .single()
    organization = org
  }

  // For superadmins, determine if this is a branch superadmin (has a row in branches table)
  let isBranchSuperadmin = false
  if (profile.role === 'superadmin') {
    const { data: branch } = await supabase
      .from('branches')
      .select('id')
      .eq('superadmin_id', user.id)
      .single()
    isBranchSuperadmin = !!branch
  }

  // Owner-capability-only flags (no further Owner toggle below Super Admin —
  // see featureFlags.ts's TENANT_FACING_KEYS comment) hide their whole nav
  // item when off. Only relevant for the owner-family roles that share the
  // owner sidebar (owner, property_manager, financial_manager) — see task #510.
  let disabledHrefs: string[] | undefined
  const ownerFamilyRoles = ['owner', 'property_manager', 'financial_manager']
  if (ownerFamilyRoles.includes(profile.role) && profile.organization_id) {
    const flags = await getEnabledFeatures(
      ['expense_tracking', 'utility_bills', 'staff_invitations'],
      profile.organization_id
    )
    const hrefByFlag: Record<string, string> = {
      expense_tracking: '/dashboard/owner/expenses',
      utility_bills: '/dashboard/owner/utilities',
      staff_invitations: '/dashboard/owner/staff',
    }
    disabledHrefs = Object.entries(hrefByFlag)
      .filter(([flagKey]) => !flags[flagKey])
      .map(([, href]) => href)
  }

  return (
    <DashboardShell profile={{ ...profile, organizations: organization }} isBranchSuperadmin={isBranchSuperadmin} disabledHrefs={disabledHrefs}>
      {children}
      {isDemo && <DemoTourPanel />}
    </DashboardShell>
  )
}
