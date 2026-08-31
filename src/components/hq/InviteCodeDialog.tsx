'use client'
import { useState } from 'react'
import { X, Copy, Check, RefreshCw, Loader2, ExternalLink } from 'lucide-react'

interface InviteData {
  code: string
  branch_name: string
  expires_at: string
  invite_url: string
}

export default function InviteCodeDialog({
  branchId,
  branchName,
  onClose,
}: {
  branchId: string
  branchName: string
  onClose: () => void
}) {
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<'code' | 'url' | null>(null)
  const [error, setError] = useState('')

  async function generate() {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/hq/branches/${branchId}/invite`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed to generate') }
      const data = await res.json()
      setInvite(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function copy(text: string, kind: 'code' | 'url') {
    await navigator.clipboard.writeText(text)
    setCopied(kind)
    setTimeout(() => setCopied(null), 2000)
  }

  const expiresDate = invite ? new Date(invite.expires_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Branch Invite Code</h2>
            <p className="text-xs text-gray-500 mt-0.5">{branchName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {!invite ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                Generate a one-time invite link for the branch superadmin.
                The link expires in <strong>7 days</strong> and can only be used once.
              </p>
              <button
                onClick={generate}
                disabled={loading}
                className="flex items-center gap-2 mx-auto px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg text-sm disabled:opacity-60 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Generate Invite Code
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Code display */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Invite Code
                </label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="flex-1 font-mono text-xl font-bold text-gray-900 tracking-widest text-center">
                    {invite.code}
                  </span>
                  <button
                    onClick={() => copy(invite.code, 'code')}
                    className="text-gray-400 hover:text-yellow-600 transition-colors p-1"
                    title="Copy code"
                  >
                    {copied === 'code' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Invite URL */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Invite Link
                </label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="flex-1 text-xs text-gray-600 font-mono break-all">
                    {invite.invite_url}
                  </span>
                  <button
                    onClick={() => copy(invite.invite_url, 'url')}
                    className="text-gray-400 hover:text-yellow-600 transition-colors p-1 flex-shrink-0"
                    title="Copy link"
                  >
                    {copied === 'url' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expiry note */}
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2.5">
                <span className="mt-0.5">⚠</span>
                <span>
                  This code expires on <strong>{expiresDate}</strong> and is valid for one use only.
                  Share it directly with the superadmin — anyone with this link can claim the branch.
                </span>
              </div>

              {/* Regenerate */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={generate}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate (invalidates current code)
                </button>
                <a
                  href={invite.invite_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-yellow-600 hover:text-yellow-700 font-medium"
                >
                  Preview <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
