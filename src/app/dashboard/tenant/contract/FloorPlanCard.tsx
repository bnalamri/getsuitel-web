'use client'
import { useState } from 'react'
import { LayoutDashboard, Maximize2, X } from 'lucide-react'

export default function FloorPlanCard({ url, unitNumber }: { url: string; unitNumber: string }) {
  const [lightbox, setLightbox] = useState(false)

  return (
    <>
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <LayoutDashboard size={16} />
          Unit Floor Plan
        </h3>
        <div
          className="relative rounded-lg overflow-hidden cursor-pointer border border-slate-200 hover:border-blue-400 transition-colors group"
          onClick={() => setLightbox(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`Unit ${unitNumber} floor plan`}
            className="w-full object-contain max-h-72 bg-slate-50"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-colors">
            <div className="opacity-0 group-hover:opacity-100 bg-white/90 rounded-full p-2 shadow">
              <Maximize2 size={18} className="text-slate-700" />
            </div>
          </div>
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            Tap to enlarge
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(false)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white flex items-center gap-1.5 text-sm"
            >
              <X size={16} /> Close
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Unit ${unitNumber} floor plan`}
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
            />
            <p className="text-center text-white/50 text-xs mt-3">Unit {unitNumber} — Floor Plan Layout</p>
          </div>
        </div>
      )}
    </>
  )
}
