'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Play, CheckCircle } from 'lucide-react'

export default function UpdateStatusButton({
  orderId, nextStatus, label, variant
}: { orderId: string; nextStatus: string; label: string; variant: 'primary' | 'success' }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function update() {
    setLoading(true)
    const supabase = createClient()
    const updates: Record<string, unknown> = { status: nextStatus }
    if (nextStatus === 'completed') updates.completed_at = new Date().toISOString()
    await supabase.from('maintenance_requests').update(updates).eq('id', orderId)
    router.refresh()
    setLoading(false)
  }

  const base = 'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap'
  const cls = variant === 'success'
    ? `${base} bg-green-600 hover:bg-green-700 text-white`
    : `${base} bg-navy-700 hover:bg-navy-800 text-white`

  return (
    <button onClick={update} disabled={loading} className={cls}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : variant === 'success' ? <CheckCircle size={14} /> : <Play size={14} />}
      {label}
    </button>
  )
}
