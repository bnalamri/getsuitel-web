'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Loader2, AlertCircle, Bell, Paperclip, UploadCloud } from 'lucide-react'
// Note: createClient is kept for storage uploads only; DB writes go through /api/notices

type Tenant = { id: string; full_name: string; email: string }
type OverdueInvoice = { id: string; amount: number; currency: string; due_date: string; tenants: { id: string; full_name: string; email: string } | null }

const LATE_PAYMENT_TEMPLATE = (tenantName: string, amount: number, currency: string, dueDate: string) =>
  `Dear ${tenantName},\n\nThis is a formal notice that your rent payment of ${amount.toLocaleString()} ${currency}, which was due on ${dueDate}, has not been received.\n\nPlease arrange payment within 5 business days to avoid further action.\n\nIf you have already made the payment, please disregard this notice and contact us with the payment confirmation.\n\nThank you for your prompt attention to this matter.\n\nSincerely,\nProperty Management`

export default function AddNoticeForm({
  orgId, tenants, overdueInvoices
}: {
  orgId: string
  tenants: Tenant[]
  overdueInvoices: OverdueInvoice[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const [attachmentName, setAttachmentName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const [type, setType] = useState<'late_payment' | 'general'>('late_payment')
  const [tenantId, setTenantId] = useState<string>(overdueInvoices[0]?.tenants?.id ?? tenants[0]?.id ?? '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sendToAll, setSendToAll] = useState(false)

  function handleTypeChange(newType: 'late_payment' | 'general') {
    setType(newType)
    if (newType === 'late_payment') {
      // Auto-fill from first overdue invoice
      const inv = overdueInvoices[0]
      if (inv?.tenants) {
        setTenantId(inv.tenants.id)
        setSubject(`Overdue Rent Payment Notice — ${inv.due_date}`)
        setBody(LATE_PAYMENT_TEMPLATE(inv.tenants.full_name, inv.amount, inv.currency, inv.due_date))
      }
      setSendToAll(false)
    } else {
      setSubject('')
      setBody('')
    }
  }

  function handleTenantChange(id: string) {
    setTenantId(id)
    if (type === 'late_payment') {
      const inv = overdueInvoices.find(i => i.tenants?.id === id)
      if (inv?.tenants) {
        setSubject(`Overdue Rent Payment Notice — ${inv.due_date}`)
        setBody(LATE_PAYMENT_TEMPLATE(inv.tenants.full_name, inv.amount, inv.currency, inv.due_date))
      }
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('File must be under 5MB'); return }
    setUploading(true)
    setError('')
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `notices/${orgId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('attachments').upload(path, file, { upsert: true })
    if (upErr) { setError(upErr.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(path)
    setAttachmentUrl(publicUrl)
    setAttachmentName(file.name)
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) { setError('Subject and body are required'); return }
    setLoading(true)
    setError('')
    const rows = sendToAll
      ? tenants.map(t => ({ tenant_id: t.id, type, subject, body, attachment_url: attachmentUrl }))
      : [{ tenant_id: tenantId || null, type, subject, body, attachment_url: attachmentUrl }]

    const res = await fetch('/api/notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    })
    const noticeJson = await res.json()
    if (!res.ok) { setError(noticeJson.error ?? 'Failed to send notice'); setLoading(false); return }

    // Send emails
    const recipients = sendToAll ? tenants : tenants.filter(t => t.id === tenantId)
    await Promise.allSettled(
      recipients.map(t => fetch('/api/email/notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: t.email, subject, body, type, attachmentUrl }),
      }))
    )

    setOpen(false)
    setSubject(''); setBody(''); setAttachmentUrl(null); setAttachmentName(null)
    router.refresh()
    setLoading(false)
  }

  function handleOpen() {
    setOpen(true)
    // Auto-select late_payment if there are overdue invoices
    if (overdueInvoices.length > 0) {
      handleTypeChange('late_payment')
    } else {
      setType('general')
    }
  }

  if (!open) return (
    <button onClick={handleOpen} className="btn-primary flex items-center gap-2">
      <Plus size={16} /> Send Notice
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="font-bold text-slate-900">Send Notice</h2>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type selector */}
          <div>
            <label className="label">Notice Type</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'late_payment', icon: AlertCircle, label: 'Late Rent Payment', color: 'border-red-300 bg-red-50 text-red-700' },
                { value: 'general', icon: Bell, label: 'General Notice', color: 'border-blue-300 bg-blue-50 text-blue-700' },
              ] as const).map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => handleTypeChange(opt.value)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all
                    ${type === opt.value ? opt.color + ' ring-2 ring-offset-1 ring-current' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  <opt.icon size={15} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tenant selector */}
          {type === 'late_payment' ? (
            <div>
              <label className="label">Tenant with overdue payment</label>
              {overdueInvoices.length === 0 ? (
                <div className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3">No overdue invoices found. Mark an invoice as overdue first.</div>
              ) : (
                <select className="input" value={tenantId} onChange={e => handleTenantChange(e.target.value)}>
                  {overdueInvoices.map(inv => inv.tenants && (
                    <option key={inv.tenants.id} value={inv.tenants.id}>
                      {inv.tenants.full_name} — {inv.amount.toLocaleString()} {inv.currency} (due {inv.due_date})
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div>
              <label className="label">Recipient</label>
              <div className="flex items-center gap-2 mb-2">
                <input type="checkbox" id="sendAll" checked={sendToAll} onChange={e => setSendToAll(e.target.checked)} className="rounded" />
                <label htmlFor="sendAll" className="text-sm text-slate-700 cursor-pointer">Send to all tenants</label>
              </div>
              {!sendToAll && (
                <select className="input" value={tenantId} onChange={e => setTenantId(e.target.value)}>
                  <option value="">— Select tenant —</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              )}
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="label">Subject</label>
            <input className="input" required value={subject} onChange={e => setSubject(e.target.value)} placeholder="Notice subject..." />
          </div>

          {/* Body */}
          <div>
            <label className="label">Message</label>
            <textarea className="input font-mono text-xs leading-relaxed" rows={8} required value={body} onChange={e => setBody(e.target.value)} placeholder="Write your notice here..." />
          </div>

          {/* Attachment (general only) */}
          <div>
            <label className="label">Attachment <span className="text-slate-400 font-normal">(optional, max 5MB)</span></label>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="hidden" onChange={handleFileUpload} />
            {attachmentName ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                <Paperclip size={14} />
                <span className="flex-1 truncate">{attachmentName}</span>
                <button type="button" onClick={() => { setAttachmentUrl(null); setAttachmentName(null) }} className="text-green-600 hover:text-green-800">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                {uploading ? 'Uploading...' : 'Click to attach a file'}
              </button>
            )}
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading || uploading} className="btn-primary flex-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Send Notice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
