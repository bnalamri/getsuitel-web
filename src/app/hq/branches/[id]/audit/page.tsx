import { redirect } from 'next/navigation'

// Item #124 — Audit log per branch — /hq/branches/[id]/audit
// The audit log is rendered as a tab inside the Branch Command Center
// (filterable timeline + CSV export — see AuditTab in ../BranchCommandCenter.tsx).
// This route exists so the checklist's literal path is a real, bookmarkable link.
export default function BranchAuditRedirect({ params }: { params: { id: string } }) {
  redirect(`/hq/branches/${params.id}?tab=audit`)
}
