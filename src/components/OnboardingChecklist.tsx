'use client'
import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X } from 'lucide-react'
import Link from 'next/link'

export type OnboardingStep = {
  label: string
  description: string
  href: string
  done: boolean
}

export default function OnboardingChecklist({
  steps,
  orgId,
}: {
  steps: OnboardingStep[]
  orgId: string
}) {
  const [visible, setVisible] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const completed = steps.filter(s => s.done).length
  const allDone = completed === steps.length
  const percent = Math.round((completed / steps.length) * 100)

  useEffect(() => {
    const key = `gs_onboarding_dismissed_${orgId}`
    if (!localStorage.getItem(key) && !allDone) {
      setVisible(true)
    }
  }, [orgId, allDone])

  function dismiss() {
    localStorage.setItem(`gs_onboarding_dismissed_${orgId}`, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="card border border-navy-100 bg-gradient-to-br from-navy-50/40 to-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">Setup Checklist</span>
              <span className="text-xs font-medium text-navy-700 bg-navy-50 px-2 py-0.5 rounded-full">
                {completed}/{steps.length} done
              </span>
            </div>
            {/* Progress bar */}
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-40 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-navy-700 rounded-full transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-xs text-slate-400">{percent}%</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button
            onClick={dismiss}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="divide-y divide-slate-100">
          {steps.map((step, i) => (
            <Link
              key={i}
              href={step.done ? '#' : step.href}
              className={`flex items-start gap-3 px-5 py-3.5 transition-colors group ${
                step.done
                  ? 'opacity-60 cursor-default'
                  : 'hover:bg-navy-50/40 cursor-pointer'
              }`}
            >
              {step.done ? (
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <Circle size={18} className="text-slate-300 group-hover:text-navy-400 shrink-0 mt-0.5 transition-colors" />
              )}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${step.done ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                  {step.label}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{step.description}</div>
              </div>
              {!step.done && (
                <span className="text-xs text-navy-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                  Go →
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Footer hint */}
      {!collapsed && (
        <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Complete all steps to fully set up your organization. You can dismiss this checklist at any time.
          </p>
        </div>
      )}
    </div>
  )
}
