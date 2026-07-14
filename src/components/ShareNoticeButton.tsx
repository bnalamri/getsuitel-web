'use client'
import { Share2 } from 'lucide-react'

export default function ShareNoticeButton({
  title,
  body,
}: {
  title: string
  body: string
}) {
  async function handleShare() {
    const text = `${title}\n\n${body}`

    // Web Share API — opens native share sheet (WhatsApp, SMS, email, etc.)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text })
        return
      } catch {
        // User cancelled or API not supported — fall through to WhatsApp fallback
      }
    }

    // Fallback: open WhatsApp with pre-filled text
    const encoded = encodeURIComponent(text)
    window.open(`https://wa.me/?text=${encoded}`, '_blank')
  }

  return (
    <button
      onClick={handleShare}
      title="Share this notice"
      className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium hover:text-emerald-900 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors"
    >
      <Share2 size={13} />
      Share
    </button>
  )
}
