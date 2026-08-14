'use client'
import { useRef } from 'react'

interface Props {
  properties: { id: string; name: string }[]
  selectedId: string
  paramName?: string
  className?: string
}

export default function PropertySelectClient({ properties, selectedId, paramName = 'property_id', className }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  return (
    <form ref={formRef} method="GET" className="inline-block">
      <select
        name={paramName}
        defaultValue={selectedId}
        onChange={() => formRef.current?.submit()}
        className={className ?? 'border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-navy-500'}
      >
        <option value="">All Properties</option>
        {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </form>
  )
}
