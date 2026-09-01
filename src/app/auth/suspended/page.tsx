'use client'

import Link from 'next/link'
import { ShieldOff, Send, CheckCircle } from 'lucide-react'
import { useState } from 'react'

export default function SuspendedPage() {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    if (!message.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/auth/contact-hq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      if (!res.ok) throw new Error('Failed to send')
      setSent(true)
    } catch {
      setError('Could not send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6">
          <ShieldOff size={28} className="text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Branch Suspended</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          Your branch has been suspended by GetSuitel HQ. Access to the platform is temporarily restricted.
          Use the form below to contact HQ directly.
        </p>

        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-6 mb-8 flex flex-col items-center gap-3">
            <CheckCircle size={28} className="text-green-600" />
            <p className="text-green-800 font-semibold text-sm">Message sent to HQ</p>
            <p className="text-green-600 text-xs">They will reply to your registered email address.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 text-left">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Contact HQ</p>
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-navy-500 placeholder:text-slate-400"
              rows={4}
              placeholder="Describe your situation or request reactivation…"
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            <button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-navy-700 hover:bg-navy-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors"
            >
              <Send size={14} />
              {sending ? 'Sending…' : 'Send to HQ'}
            </button>
          </div>
        )}

        <Link
          href="/auth/logout"
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Sign out
        </Link>
      </div>
    </div>
  )
}
