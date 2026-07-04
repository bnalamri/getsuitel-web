'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'

export default function MarkPaidButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function markPaid() {
    setLoading(true)
    await fetch('/api/invoices/markpaid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <button onClick={markPaid} disabled={loading}
      className="text-xs text-green-700 hover:text-green-900 font-medium flex items-center gap-1 whitespace-nowrap">
      {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} Mark Paid
    </button>
  )
}
