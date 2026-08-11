'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useShell } from '@/components/layout/DashboardShell'
import { Languages, Check } from 'lucide-react'

export default function LanguageSettingsForm({ userId }: { userId: string }) {
  const { lang, setLang } = useShell()
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  async function toggle() {
    const next = lang === 'en' ? 'ar' : 'en'
    setLang(next)
    setSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ lang_pref: next }).eq('id', userId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Languages size={16} className="text-orange-700" />
        <h3 className="font-semibold text-slate-900">Language / اللغة</h3>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">
            {lang === 'en' ? 'English' : 'العربية'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'en' ? 'Switch to Arabic for RTL layout' : 'التبديل إلى الإنجليزية للتخطيط من اليسار'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <Check size={14} className="text-emerald-600" />}
          <button onClick={toggle} disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
              lang === 'ar' ? 'bg-orange-700' : 'bg-slate-200'
            }`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              lang === 'ar' ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
          <span className="text-sm font-bold text-slate-600 w-6 text-center">
            {lang === 'en' ? 'EN' : 'ع'}
          </span>
        </div>
      </div>
    </div>
  )
}
