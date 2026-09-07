import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// One reusable EN/AR legal template per organization for the Tenancy
// Agreement export (src/app/api/contracts/[id]/agreement/export). Owner or
// property_manager only — this is the owner side of the platform, never
// reachable from HQ/admin roles. Editing this updates the wording used on
// every future contract export for the organization; it does not touch
// documents already exported.

async function requireOwner(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single()
  if (!profile || !['owner', 'property_manager'].includes(profile.role) || !profile.organization_id) return null
  return { user, organizationId: profile.organization_id as string }
}

// GET — load the org's template (may be null if never saved; the DB column
// defaults + matching client-side defaults in TenancyTemplateClient cover
// that case with sensible bilingual starter text, same pattern as the HQ
// branch agreement form).
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const auth = await requireOwner(supabase)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('tenancy_agreement_templates')
    .select('*')
    .eq('organization_id', auth.organizationId)
    .maybeSingle()

  return NextResponse.json(data ?? null)
}

// POST — upsert (save)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const auth = await requireOwner(supabase)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const { error } = await supabase
    .from('tenancy_agreement_templates')
    .upsert({
      organization_id: auth.organizationId,
      ...body,
      created_by: auth.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
