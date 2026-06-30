import { CreditCard } from 'lucide-react'
import Link from 'next/link'
export const metadata = { title: 'Payments' }
export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Payments</h2>
      <div className="card p-16 text-center">
        <CreditCard size={40} className="mx-auto text-slate-300 mb-3" />
        <h3 className="font-semibold text-slate-700 mb-1">Stripe payments coming soon</h3>
        <p className="text-slate-400 text-sm mb-4">Online payment collection via Stripe will be available in the next update.</p>
        <Link href="/dashboard/owner/invoices" className="btn-primary">View Invoices</Link>
      </div>
    </div>
  )
}
