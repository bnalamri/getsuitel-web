'use client'
import { createContext, useContext } from 'react'

export type DateFormat = 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd'

interface DateFormatCtx {
  dateFormat: DateFormat
  setDateFormat: (f: DateFormat) => void
}

export const DateFormatContext = createContext<DateFormatCtx>({
  dateFormat: 'dd/mm/yyyy',
  setDateFormat: () => {},
})

export function useDateFormat() {
  return useContext(DateFormatContext)
}

export function formatDate(iso: string, fmt: DateFormat): string {
  if (!iso || iso.length < 10) return ''
  const [y, m, d] = iso.split('T')[0].split('-')
  if (fmt === 'dd/mm/yyyy') return `${d}/${m}/${y}`
  if (fmt === 'mm/dd/yyyy') return `${m}/${d}/${y}`
  return `${y}-${m}-${d}`
}

export function parseToISO(display: string, fmt: DateFormat): string {
  const sep = display.includes('/') ? '/' : '-'
  const parts = display.split(sep)
  if (parts.length !== 3) return ''
  let d = '', m = '', y = ''
  if (fmt === 'dd/mm/yyyy') { [d, m, y] = parts }
  else if (fmt === 'mm/dd/yyyy') { [m, d, y] = parts }
  else { [y, m, d] = parts }
  if (d.length !== 2 || m.length !== 2 || y.length !== 4) return ''
  return `${y}-${m}-${d}`
}
