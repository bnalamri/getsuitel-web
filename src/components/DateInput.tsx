'use client'
import { useRef } from 'react'
import { Calendar } from 'lucide-react'
import { useDateFormat, formatDate, parseToISO } from '@/contexts/DateFormatContext'

interface DateInputProps {
  value: string       // always YYYY-MM-DD internally
  onChange: (val: string) => void
  required?: boolean
  min?: string
  max?: string
}

export default function DateInput({ value, onChange, required, min, max }: DateInputProps) {
  const { dateFormat } = useDateFormat()
  const nativeRef = useRef<HTMLInputElement>(null)
  const sep = dateFormat === 'yyyy-mm-dd' ? '-' : '/'

  function placeholder() {
    if (dateFormat === 'dd/mm/yyyy') return 'DD/MM/YYYY'
    if (dateFormat === 'mm/dd/yyyy') return 'MM/DD/YYYY'
    return 'YYYY-MM-DD'
  }

  function handleText(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value.replace(new RegExp(`[^0-9${sep === '/' ? '/' : '-'}]`, 'g'), '')

    // Auto-insert separator after first and second segment
    if (dateFormat === 'yyyy-mm-dd') {
      if (raw.length === 4 && !raw.includes('-')) raw += '-'
      if (raw.length === 7 && raw.split('-').length === 2) raw += '-'
    } else {
      if (raw.length === 2 && !raw.includes('/')) raw += '/'
      if (raw.length === 5 && raw.split('/').length === 2) raw += '/'
    }

    const maxLen = dateFormat === 'yyyy-mm-dd' ? 10 : 10
    raw = raw.slice(0, maxLen)
    e.target.value = raw

    const iso = parseToISO(raw, dateFormat)
    if (iso) onChange(iso)
    else if (raw === '') onChange('')
  }

  function handleNativeChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value) // native always emits YYYY-MM-DD
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder()}
        defaultValue={formatDate(value, dateFormat)}
        key={`${value}-${dateFormat}`}
        onChange={handleText}
        required={required}
        maxLength={10}
        className="input pr-9"
      />
      <input
        ref={nativeRef}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={handleNativeChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
      <button
        type="button"
        onClick={() => nativeRef.current?.showPicker?.()}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        tabIndex={-1}
      >
        <Calendar size={15} />
      </button>
    </div>
  )
}
