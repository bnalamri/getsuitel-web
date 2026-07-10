'use client'
import { Printer } from 'lucide-react'

export default function PrintButton({ label = 'Print / Save PDF' }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
    >
      <Printer size={15} />
      {label}
    </button>
  )
}
