'use client'
import { useState } from 'react'
import { Loader2, CreditCard } from 'lucide-react'

export default function PayNowButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false)

  async function handlePay() {
    setLoading(true)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId }),
    })
    const { url, error } = await res.json()
    if (error) { alert(error); setLoading(false); return }
    window.location.href = url
  }

  return (
    <button onClick={handlePay} disabled={loading}
      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors whitespace-nowrap">
      {loading ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />}
      Pay Now
    </button>
  )
}
