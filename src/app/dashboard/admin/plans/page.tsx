'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  Loader2, Save, Plus, X, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight, DollarSign, Package, Star,
} from 'lucide-react'

type Plan = {
  id: string
  slug: string
  name_en: string
  name_ar: string
  desc_en: string
  desc_ar: string
  price_monthly: number
  stripe_price_id: string
  max_properties: number
  max_units: number
  max_tenants: number
  max_staff: number
  trial_days: number
  features_en: string[]
  features_ar: string[]
  is_popular: boolean
  is_active: boolean
  sort_order: number
}

const DEFAULT_PLAN: Omit<Plan,'id'> = {
  slug:'', name_en:'', name_ar:'', desc_en:'', desc_ar:'',
  price_monthly:0, stripe_price_id:'',
  max_properties:-1, max_units:-1, max_tenants:-1, max_staff:-1,
  trial_days:30, features_en:[], features_ar:[],
  is_popular:false, is_active:true, sort_order:99,
}

function LimitInput({ label, value, onChange }: { label:string; value:number; onChange:(v:number)=>void }) {
  return (
    <div>
      <label className="label text-xs">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className="input text-sm w-24"
          value={value === -1 ? '' : value}
          placeholder="∞"
          min={-1}
          onChange={e => onChange(e.target.value === '' ? -1 : Number(e.target.value))}
        />
        <span className="text-xs text-slate-400">{value === -1 ? 'Unlimited' : `max ${value}`}</span>
      </div>
    </div>
  )
}

function FeaturesEditor({ value, onChange, label }: { value:string[]; onChange:(v:string[])=>void; label:string }) {
  const [draft, setDraft] = useState('')
  return (
    <div>
      <label className="label text-xs">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((f,i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 rounded-full px-2.5 py-0.5 text-xs">
            {f}
            <button type="button" onClick={() => onChange(value.filter((_,j)=>j!==i))}>
              <X size={10}/>
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input text-sm flex-1"
          placeholder="Add feature…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if(e.key==='Enter'&&draft.trim()){onChange([...value,draft.trim()]);setDraft('')} }}
        />
        <button
          type="button"
          className="btn-secondary px-3 text-sm"
          onClick={() => { if(draft.trim()){onChange([...value,draft.trim()]);setDraft('')} }}
        >
          Add
        </button>
      </div>
    </div>
  )
}

function PlanEditor({ plan, onSave, onCancel, saving }:
  { plan:Partial<Plan>; onSave:(p:Partial<Plan>)=>void; onCancel:()=>void; saving:boolean }) {
  const [p, setP] = useState<Partial<Plan>>(plan)
  const set = (k: keyof Plan, v: unknown) => setP(prev => ({...prev,[k]:v}))

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Slug (unique key)</label>
          <input className="input" value={p.slug??''} onChange={e=>set('slug',e.target.value)} placeholder="e.g. pro"/>
        </div>
        <div>
          <label className="label">Price / month (USD)</label>
          <div className="relative">
            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input type="number" className="input pl-8" value={p.price_monthly??0}
              onChange={e=>set('price_monthly',Number(e.target.value))} min={0}/>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Name (English)</label>
          <input className="input" value={p.name_en??''} onChange={e=>set('name_en',e.target.value)}/>
        </div>
        <div>
          <label className="label">Name (Arabic)</label>
          <input className="input text-right" dir="rtl" value={p.name_ar??''} onChange={e=>set('name_ar',e.target.value)}/>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Description (English)</label>
          <input className="input" value={p.desc_en??''} onChange={e=>set('desc_en',e.target.value)}/>
        </div>
        <div>
          <label className="label">Description (Arabic)</label>
          <input className="input text-right" dir="rtl" value={p.desc_ar??''} onChange={e=>set('desc_ar',e.target.value)}/>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Stripe Price ID</label>
          <input className="input font-mono text-sm" value={p.stripe_price_id??''}
            onChange={e=>set('stripe_price_id',e.target.value)} placeholder="price_..."/>
        </div>
        <div>
          <label className="label">Trial Days</label>
          <input type="number" className="input" value={p.trial_days??30}
            onChange={e=>set('trial_days',Number(e.target.value))} min={0}/>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <LimitInput label="Max Properties" value={p.max_properties??-1}
          onChange={v=>set('max_properties',v)}/>
        <LimitInput label="Max Units" value={p.max_units??-1}
          onChange={v=>set('max_units',v)}/>
        <LimitInput label="Max Tenants" value={p.max_tenants??-1}
          onChange={v=>set('max_tenants',v)}/>
        <LimitInput label="Max Staff Members" value={p.max_staff??-1}
          onChange={v=>set('max_staff',v)}/>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FeaturesEditor label="Features (English)" value={p.features_en??[]}
          onChange={v=>set('features_en',v)}/>
        <FeaturesEditor label="Features (Arabic)" value={p.features_ar??[]}
          onChange={v=>set('features_ar',v)}/>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="rounded" checked={p.is_popular??false}
            onChange={e=>set('is_popular',e.target.checked)}/>
          <span className="text-sm text-slate-700">Mark as Popular</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="rounded" checked={p.is_active??true}
            onChange={e=>set('is_active',e.target.checked)}/>
          <span className="text-sm text-slate-700">Active (visible on site)</span>
        </label>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-700">Sort order</label>
          <input type="number" className="input w-20 text-sm" value={p.sort_order??0}
            onChange={e=>set('sort_order',Number(e.target.value))}/>
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-slate-100">
        <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button onClick={()=>onSave(p)} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
          Save Plan
        </button>
      </div>
    </div>
  )
}

export default function PlansPage() {
  const [plans, setPlans]     = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState<string|null>(null)
  const [creating, setCreating]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/plans')
    const data = await res.json()
    setPlans(data ?? []); setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function savePlan(plan: Partial<Plan>) {
    setSaving(true); setError(''); setSuccess('')
    try {
      const isNew = !plan.id
      const res = await fetch('/api/admin/plans', {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSuccess(`Plan "${data.name_en}" saved successfully.`)
      setEditingId(null); setCreating(false)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error saving plan')
    }
    setSaving(false)
  }

  async function toggleActive(plan: Plan) {
    setSaving(true)
    await fetch('/api/admin/plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: plan.id, is_active: !plan.is_active }),
    })
    await load(); setSaving(false)
  }

  const fmt = (v: number) => v === -1 ? '∞' : v.toString()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package size={22} className="text-navy-600"/> Plans & Pricing
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage subscription plans. Changes reflect immediately on the landing page, register flow, and admin dashboard.
          </p>
        </div>
        {!creating && (
          <button onClick={()=>setCreating(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16}/> New Plan
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm mb-4">{success}</div>
      )}

      {/* New plan editor */}
      {creating && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">New Plan</h2>
          <PlanEditor
            plan={{...DEFAULT_PLAN}}
            onSave={savePlan}
            onCancel={()=>setCreating(false)}
            saving={saving}
          />
        </div>
      )}

      {/* Plans list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-slate-400" size={28}/>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map(plan => (
            <div key={plan.id} className={`bg-white border rounded-2xl overflow-hidden transition-all ${
              plan.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'
            }`}>
              {/* Collapsed header */}
              {editingId !== plan.id ? (
                <div className="flex items-center gap-4 p-5">
                  {/* Status dot */}
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${plan.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}/>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{plan.name_en}</span>
                      {plan.is_popular && (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">
                          <Star size={10} fill="currentColor"/> Popular
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-mono">{plan.slug}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{plan.desc_en}</p>
                  </div>

                  <div className="flex items-center gap-6 text-sm flex-shrink-0">
                    <div className="text-center">
                      <p className="font-bold text-slate-900 text-lg">${plan.price_monthly}<span className="text-xs text-slate-400 font-normal">/mo</span></p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="text-xs text-slate-400 uppercase tracking-wide">Properties</p>
                      <p className="font-semibold text-slate-700">{fmt(plan.max_properties)}</p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="text-xs text-slate-400 uppercase tracking-wide">Units</p>
                      <p className="font-semibold text-slate-700">{fmt(plan.max_units)}</p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="text-xs text-slate-400 uppercase tracking-wide">Tenants</p>
                      <p className="font-semibold text-slate-700">{fmt(plan.max_tenants)}</p>
                    </div>
                    <div className="text-center hidden md:block">
                      <p className="text-xs text-slate-400 uppercase tracking-wide">Trial</p>
                      <p className="font-semibold text-slate-700">{plan.trial_days}d</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={()=>toggleActive(plan)}
                      title={plan.is_active ? 'Deactivate' : 'Activate'}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {plan.is_active
                        ? <ToggleRight size={22} className="text-emerald-500"/>
                        : <ToggleLeft size={22}/>}
                    </button>
                    <button
                      onClick={()=>setEditingId(plan.id)}
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                    >
                      <ChevronDown size={13}/> Edit
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-5 pt-4 pb-2">
                    <span className="text-sm font-semibold text-navy-700">Editing: {plan.name_en}</span>
                    <button onClick={()=>setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                      <ChevronUp size={16}/>
                    </button>
                  </div>
                  <div className="px-5 pb-5">
                    <PlanEditor
                      plan={plan}
                      onSave={savePlan}
                      onCancel={()=>setEditingId(null)}
                      saving={saving}
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-6 text-center">
        Changes take up to 5 minutes to reflect on cached pages. Toggle active/inactive takes effect immediately.
      </p>
    </div>
  )
}
