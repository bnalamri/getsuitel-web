'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Loader2 } from 'lucide-react'

type Profile = { id: string; full_name: string | null; email: string; avatar_url?: string | null }

export default function HQSettingsClient({ profile }: { profile: Profile | null }) {
  const [name, setName]     = useState(profile?.full_name ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState('')

  async function save() {
    setSaving(true); setMsg('')
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ full_name: name }).eq('id', profile!.id)
    setSaving(false)
    setMsg(error ? 'Failed to save: ' + error.message : 'Saved successfully')
  }

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">HQ Settings</h1>
        <p className="text-sm text-gray-500">Manage your HQ admin profile</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Profile</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{profile?.email}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        {msg && (
          <p className={`text-sm ${msg.startsWith('Failed') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg text-sm disabled:opacity-60 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Role</p>
        <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 font-semibold text-sm rounded-full">
          Layer 0 · hq_admin
        </span>
        <p className="text-xs text-gray-400 mt-2">This account has global read/write access across all branches.</p>
      </div>
    </div>
  )
}
