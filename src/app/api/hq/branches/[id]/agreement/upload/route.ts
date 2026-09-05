import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { issueBranchInvite } from '@/lib/hq/branchInvite'

async function requireHQ(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['hq_admin', 'hq_finance', 'hq_staff'].includes(profile.role)) return null
  return user
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const user = await requireHQ(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!['pdf', 'docx', 'jpg', 'jpeg', 'png'].includes(ext ?? '')) {
    return NextResponse.json({ error: 'Invalid file type. Upload PDF, DOCX, or image.' }, { status: 400 })
  }

  // Use admin client for storage to bypass RLS
  const admin = createAdminClient()
  const bytes = await file.arrayBuffer()
  const path = `branch-agreements/${params.id}/signed_${Date.now()}.${ext}`

  const { error: uploadErr } = await admin.storage
    .from('contract-documents')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('contract-documents').getPublicUrl(path)

  const { error: dbErr } = await admin
    .from('branch_agreements')
    .upsert(
      {
        branch_id: params.id,
        signed_doc_url: publicUrl,
        signed_doc_name: file.name,
        signed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'branch_id' }
    )

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  // ─── Auto-activation on signature ──────────────────────────────────────
  // This is the ONE place a branch transitions pending_agreement → active
  // and its superadmin invite is generated (+ emailed, if HQ set
  // pending_superadmin_email). No separate "Activate Branch" button to
  // remember to click — uploading the signed copy IS the activation event.
  // The status filter in the UPDATE makes this idempotent: re-uploading a
  // replacement signed copy on an already-active branch just updates the
  // document, it does not re-activate or re-invite.
  let activated = false
  let invited = false
  try {
    const { data: branch } = await admin
      .from('branches')
      .select('id, status, display_name, pending_superadmin_email')
      .eq('id', params.id)
      .single()

    if (branch?.status === 'pending_agreement') {
      const { error: activateErr } = await admin
        .from('branches')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', params.id)
        .eq('status', 'pending_agreement') // guards against a double-fire race

      if (!activateErr) {
        activated = true
        await admin.from('hq_audit_logs').insert({
          branch_id: params.id,
          actor_id: user.id,
          action: 'status_change',
          details: { from: 'pending_agreement', to: 'active', reason: 'agreement_signed' },
        })

        if (branch.pending_superadmin_email) {
          const result = await issueBranchInvite(admin, {
            branchId: params.id,
            branchName: branch.display_name,
            createdBy: user.id,
            email: branch.pending_superadmin_email,
          })
          invited = result.emailed
        }
      }
    }
  } catch {
    // Activation/invite failure must never fail the upload itself — the
    // signed copy is already saved. HQ can still activate/invite manually
    // from the Branch Command Center's Actions tab if this silently didn't fire.
  }

  return NextResponse.json({ url: publicUrl, name: file.name, activated, invited })
}
