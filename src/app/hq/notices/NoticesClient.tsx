'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Plus, Trash2, Loader2, ChevronDown, ChevronUp, X, Megaphone, CheckCircle2 } from 'lucide-react'

type Branch  = { id: string; display_name: string }
type Notice  = {
  id: string; title: string; body: string; priority: string
  created_at: string; expires_at: string | null
  target_branch_ids: string[] | null
  profiles: { full_name: string | null } | null
}

const PRIORITY_STYLE: Record<string, string> = {
  normal:  'bg-blue-100  text-blue-700',
  high:    'bg-amber-100 text-amber-700',
  urgent:  'bg-red-100   text-red-700',
}

export default function NoticesClient({
  branches,
  initialNotices,
}: {
  branches: Branch[]
  initialNotices: Notice[]
}) {
  const router = useRouter()
  const [notices, setNotices]   = useState<Notice[]>(initialNotices)
  const [showForm, setShowForm] = useState(false)

  // ── Platform Banner state ────────────────────────────────────────────────
  const [activeBanner, setActiveBanner]       = useState<{ text: string; severity: string } | null>(null)
  const [bannerText,   setBannerText]         = useState('')
  const [bannerSev,    setBannerSev]          = useState<'info' | 'warning' | 'critical'>('info')
  const [bannerSaving, setBannerSaving]       = useState(false)
  const [bannerMsg,    setBannerMsg]          = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/hq/announcement')
      .then(r => r.json())
      .then(d => { if (d.text) setActiveBanner({ text: d.text, severity: d.severity }) })
      .catch(() => {})
  }, [])

  async function setBanner() {
    if (!bannerText.trim()) return
    setBannerSaving(true); setBannerMsg(null)
    const res = await fetch('/api/hq/announcement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: bannerText.trim(), severity: bannerSev }),
    })
    setBannerSaving(false)
    if (!res.ok) { setBannerMsg('Failed to set banner'); return }
    setActiveBanner({ text: bannerText.trim(), severity: bannerSev })
    setBannerText(''); setBannerMsg('Banner is now live on all superadmin dashboards')
    setTimeout(() => setBannerMsg(null), 3000)
  }

  async function clearBanner() {
    setBannerSaving(true)
    await fetch('/api/hq/announcement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: null }),
    })
    setBannerSaving(false)
    setActiveBanner(null)
    setBannerMsg('Banner cleared')
    setTimeout(() => setBannerMsg(null), 2000)
  }

  // Form state
  const [title,          setTitle]          = useState('')
  const [body,           setBody]           = useState('')
  const [priority,       setPriority]       = useState<'normal' | 'high' | 'urgent'>('normal')
  const [targetAll,      setTargetAll]      = useState(true)
  const [selectedBranches, setSelected]     = useState<string[]>([])
  const [expiresAt,      setExpiresAt]      = useState('')
  const [saving,         setSaving]         = useState(false)
  const [msg,            setMsg]            = useState<{ ok: boolean; text: string } | null>(null)
  const [deleting,       setDeleting]       = useState<string | null>(null)
  const [expanded,       setExpanded]       = useState<string | null>(null)

  function toggleBranch(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setSaving(true); setMsg(null)
    const res = await fetch('/api/hq/notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, body,
        priority,
        target_branch_ids: targetAll ? null : selectedBranches,
        expires_at: expiresAt || null,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const e = await res.json()
      setMsg({ ok: false, text: e.error ?? 'Failed to send notice' })
      return
    }
    setMsg({ ok: true, text: 'Notice sent successfully!' })
    setTitle(''); setBody(''); setPriority('normal')
    setTargetAll(true); setSelected([]); setExpiresAt('')
    setTimeout(() => { setMsg(null); setShowForm(false) }, 2000)
    router.refresh()
  }

  async function deleteNotice(id: string) {
    setDeleting(id)
    await fetch(`/api/hq/notices?id=${id}`, { method: 'DELETE' })
    setNotices(prev => prev.filter(n => n.id !== id))
    setDeleting(null)
  }

  const input   = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400'
  const select  = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white'
  const label   = 'block text-sm font-medium text-gray-700 mb-1'

  const SEV_BANNER = {
    info:     { bg: 'bg-blue-50 border-blue-200',   text: 'text-blue-800',  dot: 'bg-blue-400'  },
    warning:  { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', dot: 'bg-amber-400' },
    critical: { bg: 'bg-red-50 border-red-200',     text: 'text-red-800',   dot: 'bg-red-500'   },
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">

      {/* ── Platform-Wide Banner ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="w-4 h-4 text-yellow-600" />
          <h2 className="font-semibold text-gray-900">Platform-Wide Banner</h2>
          <span className="text-xs text-gray-400 ml-1">Shows on all superadmin dashboards</span>
        </div>

        {/* Active banner preview */}
        {activeBanner && (
          <div className={`flex items-start gap-3 p-3 rounded-lg border mb-4 ${SEV_BANNER[activeBanner.severity as keyof typeof SEV_BANNER]?.bg ?? SEV_BANNER.info.bg}`}>
            <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${SEV_BANNER[activeBanner.severity as keyof typeof SEV_BANNER]?.dot ?? SEV_BANNER.info.dot}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${SEV_BANNER[activeBanner.severity as keyof typeof SEV_BANNER]?.text ?? SEV_BANNER.info.text}`}>
                {activeBanner.text}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">Severity: {activeBanner.severity}</p>
            </div>
            <button
              onClick={clearBanner}
              disabled={bannerSaving}
              className="flex-shrink-0 text-xs text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg px-2 py-1 hover:border-red-200 transition-colors disabled:opacity-50"
            >
              {bannerSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Clear'}
            </button>
          </div>
        )}

        {!activeBanner && (
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <CheckCircle2 className="w-4 h-4 text-gray-300" />
            No active banner
          </div>
        )}

        {/* Set banner form */}
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="Type your announcement…"
            value={bannerText}
            onChange={e => setBannerText(e.target.value)}
            maxLength={200}
          />
          <select
            value={bannerSev}
            onChange={e => setBannerSev(e.target.value as 'info' | 'warning' | 'critical')}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <button
            onClick={setBanner}
            disabled={bannerSaving || !bannerText.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg text-sm disabled:opacity-50 transition-colors"
          >
            {bannerSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
            Set Banner
          </button>
        </div>
        {bannerMsg && (
          <p className="text-xs text-green-600 mt-2">{bannerMsg}</p>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HQ Notices</h1>
          <p className="text-sm text-gray-500 mt-0.5">Broadcast announcements to branch superadmins</p>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg text-sm transition-colors"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'New Notice'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Create Notice</h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className={label}>Title *</label>
              <input className={input} value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Notice title" required maxLength={120} />
            </div>
            <div>
              <label className={label}>Message *</label>
              <textarea className={`${input} resize-none`} rows={4} value={body}
                onChange={e => setBody(e.target.value)} placeholder="Write your announcement…" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label}>Priority</label>
                <select className={select} value={priority}
                  onChange={e => setPriority(e.target.value as 'normal' | 'high' | 'urgent')}>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className={label}>Expires (optional)</label>
                <input type="date" className={input} value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <div>
              <label className={label}>Recipient Branches</label>
              <div className="flex gap-3 mb-2">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" checked={targetAll} onChange={() => setTargetAll(true)} /> All branches
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" checked={!targetAll} onChange={() => setTargetAll(false)} /> Specific branches
                </label>
              </div>
              {!targetAll && (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {branches.map(b => (
                    <label key={b.id} className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors">
                      <input type="checkbox" checked={selectedBranches.includes(b.id)}
                        onChange={() => toggleBranch(b.id)} className="flex-shrink-0" />
                      <span className="truncate">{b.display_name}</span>
                    </label>
                  ))}
                  {!branches.length && <p className="text-xs text-gray-400 px-3 py-2">No active branches</p>}
                </div>
              )}
            </div>
            {msg && (
              <p className={`text-sm px-3 py-2 rounded-lg ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {msg.text}
              </p>
            )}
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg text-sm disabled:opacity-60 transition-colors">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
              {saving ? 'Sending…' : 'Send Notice'}
            </button>
          </form>
        </div>
      )}

      {/* Notices list */}
      {notices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No notices sent yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map(n => {
            const isExpanded = expanded === n.id
            const expired = n.expires_at && new Date(n.expires_at) < new Date()
            return (
              <div key={n.id} className={`bg-white rounded-xl border ${expired ? 'border-gray-100 opacity-60' : 'border-gray-200'} overflow-hidden`}>
                <div className="flex items-start gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${PRIORITY_STYLE[n.priority] ?? PRIORITY_STYLE.normal}`}>
                        {n.priority}
                      </span>
                      {expired && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-400">Expired</span>
                      )}
                      {n.target_branch_ids && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                          {n.target_branch_ids.length} branch{n.target_branch_ids.length !== 1 ? 'es' : ''}
                        </span>
                      )}
                      {!n.target_branch_ids && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">All branches</span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">{n.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(n.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {n.profiles?.full_name && ` · by ${n.profiles.full_name}`}
                      {n.expires_at && ` · expires ${new Date(n.expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setExpanded(isExpanded ? null : n.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button onClick={() => deleteNotice(n.id)} disabled={deleting === n.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                      {deleting === n.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap pt-3">{n.body}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
