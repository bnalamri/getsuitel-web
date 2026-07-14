'use client'
import { Share2, Loader2 } from 'lucide-react'
import { useState } from 'react'

export default function ShareNoticeButton({
  title,
  body,
}: {
  title: string
  body: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleShare() {
    setLoading(true)
    try {
      // 1. Try to share as a branded image card
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          const params = new URLSearchParams({ title, body, t: Date.now().toString() })
          const imgRes = await fetch(`/api/notice-image?${params}`, { cache: 'no-store' })
          const blob = await imgRes.blob()
          const file = new File([blob], 'getsuitel-notice.png', { type: 'image/png' })

          // Share as image if browser supports file sharing (Chrome/Android, Safari/iOS)
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title })
            return
          }

          // File sharing not supported — fall back to text share
          await navigator.share({ title, text: `${title}\n\n${body}` })
          return
        } catch (err) {
          // User cancelled — don't fall through to WhatsApp
          if (err instanceof Error && err.name === 'AbortError') return
          // Other error — fall through to WhatsApp
        }
      }

      // 2. Fallback: open WhatsApp with text
      const encoded = encodeURIComponent(`${title}\n\n${body}`)
      window.open(`https://wa.me/?text=${encoded}`, '_blank')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      title="Share this notice as an image"
      className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium hover:text-emerald-900 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />}
      Share
    </button>
  )
}
