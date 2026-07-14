'use client'
import { useState } from 'react'
import { Bell, Clock, ChevronDown, ChevronUp } from 'lucide-react'

type PlatformNotice = {
  id: string
  title: string
  body: string
  created_at: string
  read: boolean
  target_org_id: string | null
}

export default function PlatformNoticeList({ initial }: { initial: PlatformNotice[] }) {
  const [notices, setNotices] = useState(initial)
  const [expanded, setExpanded] = useState<string | null>(
    // auto-open the first unread
    initial.find(n => !n.read)?.id ?? null
  )

  async function markRead(id: string) {
    await fetch('/api/owner/platform-notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noticeId: id }),
    })
    setNotices(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function toggle(id: string) {
    if (expanded === id) {
      setExpanded(null)
    } else {
      setExpanded(id)
      const notice = notices.find(n => n.id === id)
      if (notice && !notice.read) await markRead(id)
    }
  }

  if (notices.length === 0) {
    return (
      <div className="card p-16 text-center">
        <Bell size={40} className="mx-auto text-slate-300 mb-3" />
        <h3 className="font-semibold text-slate-700 mb-1">No notices from GetSuitel</h3>
        <p className="text-slate-400 text-sm">We&apos;ll send you platform updates and announcements here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {notices.map(n => (
        <div
          key={n.id}
          className={`card overflow-hidden transition-all ${!n.read ? 'border-l-4 border-l-navy-700' : ''}`}
        >
          <button
            onClick={() => toggle(n.id)}
            className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
          >
            <div className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${n.read ? 'bg-slate-300' : 'bg-navy-700'}`} />
            <div className="flex-1 min-w-0">
              <div className={`font-semibold text-slate-900 ${!n.read ? 'font-bold' : ''}`}>{n.title}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock size={10} />
                  {new Date(n.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                {!n.read && (
                  <span className="text-[10px] font-bold bg-navy-700 text-white px-1.5 py-0.5 rounded-full">NEW</span>
                )}
              </div>
            </div>
            {expanded === n.id ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0 mt-1" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0 mt-1" />}
          </button>

          {expanded === n.id && (
            <div className="px-9 pb-5">
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line border-t border-slate-100 pt-4">
                {n.body}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
