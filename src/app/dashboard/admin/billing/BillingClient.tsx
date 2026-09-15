'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, Smartphone, Copy, Check, Upload, Loader2,
  Clock, CheckCircle2, XCircle, FileText,
} from 'lucide-react'
import OmrSymbol from '@/components/ui/OmrSymbol'
import CurrencyAmount from '@/components/CurrencyAmount'

type Branch = { id: string; display_name: string; license_fee_omr: number; revenue_share_pct: number; currency?: string | null } | null
type Billing = {
  id: string; month: string; total_revenue_omr: number; share_amount_omr: number; license_fee_omr: number
  currency?: string | null
  status: 'pending' | 'submitted' | 'paid' | 'rejected'
  payment_method: string | null; receipt_url: string | null; submitted_at: string | null
  paid_at: string | null; rejection_reason: string | null; notes: string | null
}
type HqPayment = {
  hq_bank_name?: string | null; hq_bank_account_name?: string | null; hq_bank_iban?: string | null
  hq_mobile_transfer_number?: string | null; hq_mobile_transfer_label?: string | null
} | null

const card = 'bg-white rounded-xl border border-gray-200 p-6'

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-mono text-gray-800">{value}</p>
      </div>
      <button
        onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
        className="text-gray-400 hover:text-gray-600"
      >
        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  )
}

const STATUS_BADGE: Record<Billing['status'], { label: string; className: string; icon: typeof Clock }> = {
  pending:   { label: 'Awaiting Payment',       className: 'bg-gray-100 text-gray-700',   icon: Clock },
  submitted: { label: 'Awaiting HQ Confirmation', className: 'bg-yellow-100 text-yellow-800', icon: FileText },
  paid:      { label: 'Paid',                   className: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  rejected:  { label: 'Rejected — Resubmit',     className: 'bg-red-100 text-red-700',      icon: XCircle },
}

function ReceiptForm({ billingId, onDone }: { billingId: string; onDone: () => void }) {
  const [method, setMethod] = useState('bank_transfer')
  const [notes, setNotes]   = useState('')
  const [file, setFile]     = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function submit() {
    setLoading(true); setError('')
    const fd = new FormData()
    fd.append('billing_id', billingId)
    fd.append('method', method)
    if (notes) fd.append('notes', notes)
    if (file) fd.append('file', file)
    const res = await fetch('/api/superadmin/billing/receipt', { method: 'POST', body: fd })
    setLoading(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error submitting receipt'); return }
    onDone()
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white" value={method} onChange={e => setMethod(e.target.value)}>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="mobile_transfer">Mobile Transfer</option>
          <option value="cash">Cash</option>
        </select>
        <input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
      </div>
      <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button onClick={submit} disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-xs font-semibold rounded-lg disabled:opacity-60">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        Submit Receipt
      </button>
    </div>
  )
}

export default function BillingClient({ branch, billing, hqPayment }: { branch: Branch; billing: Billing[]; hqPayment: HqPayment }) {
  const router = useRouter()
  const [openReceiptFor, setOpenReceiptFor] = useState<string | null>(null)

  // Revenue share travels in this branch's own currency (see
  // 20260915l_branch_currency.sql); license fee is always a flat OMR fee.
  // Track them separately rather than summing — for non-OMR branches,
  // adding SAR/AED share to an OMR license fee would be meaningless.
  const branchCurrency = branch?.currency || 'OMR'
  const shareOwed   = billing.filter(b => b.status !== 'paid').reduce((s, b) => s + Number(b.share_amount_omr), 0)
  const shareDone   = billing.filter(b => b.status === 'paid').reduce((s, b) => s + Number(b.share_amount_omr), 0)
  const licenseOwed = billing.filter(b => b.status !== 'paid').reduce((s, b) => s + Number(b.license_fee_omr), 0)
  const licenseDone = billing.filter(b => b.status === 'paid').reduce((s, b) => s + Number(b.license_fee_omr), 0)

  if (!branch) {
    return <div className="p-6"><div className={card}>No branch is linked to your account yet.</div></div>
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">HQ Billing</h1>
        <p className="text-sm text-gray-500">Your monthly license fee + revenue share owed to GetSuitel HQ</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={card}>
          <p className="text-xs text-gray-500 mb-1">Outstanding</p>
          <p className="text-lg font-bold text-gray-900 flex items-center gap-1">
            <CurrencyAmount value={shareOwed} currency={branchCurrency} /> <span className="text-xs font-normal text-gray-400">revenue share</span>
          </p>
          <p className="text-lg font-bold text-gray-900 flex items-center gap-1">
            <OmrSymbol variant="dark" size={15} /> {licenseOwed.toFixed(3)} <span className="text-xs font-normal text-gray-400">license fee</span>
          </p>
        </div>
        <div className={card}>
          <p className="text-xs text-gray-500 mb-1">Paid to Date</p>
          <p className="text-lg font-bold text-gray-900 flex items-center gap-1">
            <CurrencyAmount value={shareDone} currency={branchCurrency} /> <span className="text-xs font-normal text-gray-400">revenue share</span>
          </p>
          <p className="text-lg font-bold text-gray-900 flex items-center gap-1">
            <OmrSymbol variant="dark" size={15} /> {licenseDone.toFixed(3)} <span className="text-xs font-normal text-gray-400">license fee</span>
          </p>
        </div>
      </div>

      {/* HQ Payment Details */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-yellow-600" />
          <h2 className="font-semibold text-gray-900">Where to Pay HQ</h2>
        </div>
        {hqPayment?.hq_bank_iban || hqPayment?.hq_mobile_transfer_number ? (
          <div className="space-y-2">
            {hqPayment.hq_bank_name && <CopyField label="Bank" value={hqPayment.hq_bank_name} />}
            {hqPayment.hq_bank_account_name && <CopyField label="Account Name" value={hqPayment.hq_bank_account_name} />}
            {hqPayment.hq_bank_iban && <CopyField label="IBAN" value={hqPayment.hq_bank_iban} />}
            {hqPayment.hq_mobile_transfer_number && (
              <CopyField label={hqPayment.hq_mobile_transfer_label ?? 'Mobile Transfer'} value={hqPayment.hq_mobile_transfer_number} />
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" /> HQ hasn&apos;t published payment details yet.</p>
        )}
      </div>

      {/* Billing history */}
      <div className={card}>
        <h2 className="font-semibold text-gray-900 mb-4">Billing History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="pb-2 pr-4">Month</th>
                <th className="pb-2 pr-4">Revenue Share</th>
                <th className="pb-2 pr-4">License Fee (OMR)</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {billing.map(b => {
                const badge = STATUS_BADGE[b.status]
                const Icon = badge.icon
                return (
                  <tr key={b.id} className="align-top">
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {new Date(b.month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    </td>
                    <td className="py-3 pr-4"><CurrencyAmount value={Number(b.share_amount_omr)} currency={b.currency || branchCurrency} /></td>
                    <td className="py-3 pr-4"><CurrencyAmount value={Number(b.license_fee_omr)} currency="OMR" /></td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                        <Icon className="w-3 h-3" /> {badge.label}
                      </span>
                      {b.status === 'rejected' && b.rejection_reason && (
                        <p className="text-xs text-red-500 mt-1">{b.rejection_reason}</p>
                      )}
                      {b.status === 'submitted' && b.receipt_url && (
                        <a href={b.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block mt-1">View receipt</a>
                      )}
                    </td>
                    <td className="py-3">
                      {(b.status === 'pending' || b.status === 'rejected') && (
                        openReceiptFor === b.id ? (
                          <ReceiptForm billingId={b.id} onDone={() => { setOpenReceiptFor(null); router.refresh() }} />
                        ) : (
                          <button
                            onClick={() => setOpenReceiptFor(b.id)}
                            className="text-xs font-semibold text-yellow-700 hover:underline"
                          >
                            Submit Receipt
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                )
              })}
              {billing.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-gray-400">No billing records yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
