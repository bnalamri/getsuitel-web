'use client'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import Image from 'next/image'

const COUNTRIES = [
  { code: '213', iso: 'dz', name: 'Algeria' },
  { code: '973', iso: 'bh', name: 'Bahrain' },
  { code: '880', iso: 'bd', name: 'Bangladesh' },
  { code: '20',  iso: 'eg', name: 'Egypt' },
  { code: '33',  iso: 'fr', name: 'France' },
  { code: '49',  iso: 'de', name: 'Germany' },
  { code: '91',  iso: 'in', name: 'India' },
  { code: '98',  iso: 'ir', name: 'Iran' },
  { code: '964', iso: 'iq', name: 'Iraq' },
  { code: '962', iso: 'jo', name: 'Jordan' },
  { code: '965', iso: 'kw', name: 'Kuwait' },
  { code: '961', iso: 'lb', name: 'Lebanon' },
  { code: '218', iso: 'ly', name: 'Libya' },
  { code: '212', iso: 'ma', name: 'Morocco' },
  { code: '977', iso: 'np', name: 'Nepal' },
  { code: '968', iso: 'om', name: 'Oman' },
  { code: '92',  iso: 'pk', name: 'Pakistan' },
  { code: '63',  iso: 'ph', name: 'Philippines' },
  { code: '974', iso: 'qa', name: 'Qatar' },
  { code: '966', iso: 'sa', name: 'Saudi Arabia' },
  { code: '94',  iso: 'lk', name: 'Sri Lanka' },
  { code: '963', iso: 'sy', name: 'Syria' },
  { code: '216', iso: 'tn', name: 'Tunisia' },
  { code: '90',  iso: 'tr', name: 'Turkey' },
  { code: '971', iso: 'ae', name: 'UAE' },
  { code: '44',  iso: 'gb', name: 'UK' },
  { code: '1',   iso: 'us', name: 'USA / Canada' },
  { code: '967', iso: 'ye', name: 'Yemen' },
]

const COUNTRIES_BY_LEN = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length)

function Flag({ iso }: { iso: string }) {
  return (
    <Image
      src={`https://flagcdn.com/w20/${iso}.png`}
      width={20}
      height={14}
      alt={iso.toUpperCase()}
      className="rounded-sm object-cover"
      unoptimized
    />
  )
}

function parsePhone(value: string): { code: string; number: string } {
  if (!value) return { code: '968', number: '' }
  const clean = value.replace(/\s/g, '')
  if (!clean.startsWith('+')) return { code: '968', number: clean.replace(/\D/g, '') }
  const digits = clean.slice(1)
  for (const c of COUNTRIES_BY_LEN) {
    if (digits.startsWith(c.code)) {
      return { code: c.code, number: digits.slice(c.code.length) }
    }
  }
  return { code: '968', number: digits }
}

interface PhoneInputProps {
  value: string
  onChange: (val: string) => void
  required?: boolean
  placeholder?: string
}

export default function PhoneInput({ value, onChange, required, placeholder = '5XXXXXXXX' }: PhoneInputProps) {
  const init = parsePhone(value)
  const [countryCode, setCountryCode] = useState(init.code)
  const [localNumber, setLocalNumber] = useState(init.number)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropUp, setDropUp] = useState(false)
  const [dropRight, setDropRight] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const prevValue = useRef(value)

  useEffect(() => {
    const combined = localNumber ? `+${countryCode}${localNumber}` : ''
    onChange(combined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode, localNumber])

  useEffect(() => {
    if (value === '' && prevValue.current !== '') setLocalNumber('')
    prevValue.current = value
  }, [value])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleOpen() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const dropdownH = 280 // approx height: search bar + list
      const dropdownW = 224 // w-56

      // Flip up if not enough space below
      setDropUp(rect.bottom + dropdownH > window.innerHeight)
      // Align right if not enough space to the right
      setDropRight(rect.left + dropdownW > window.innerWidth)
    }
    setOpen(o => !o)
    setSearch('')
  }

  const selected = COUNTRIES.find(c => c.code === countryCode) ?? COUNTRIES[0]
  const filtered = search
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.includes(search.replace('+', ''))
      )
    : COUNTRIES

  function handleNumber(e: React.ChangeEvent<HTMLInputElement>) {
    setLocalNumber(e.target.value.replace(/[^0-9]/g, ''))
  }

  // Build dropdown position classes
  const posV = dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
  const posH = dropRight ? 'right-0' : 'left-0'

  return (
    <div className="flex gap-2" ref={dropRef}>
      {/* Country code button */}
      <div className="relative shrink-0">
        <button
          ref={triggerRef}
          type="button"
          onClick={handleOpen}
          className="flex items-center gap-1.5 h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-navy-500 whitespace-nowrap"
        >
          <Flag iso={selected.iso} />
          <span>+{selected.code}</span>
          <ChevronDown size={13} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className={`absolute z-50 ${posV} ${posH} w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden`}>
            <div className="p-2 border-b border-slate-100">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search country…"
                autoFocus
                onClick={e => e.stopPropagation()}
                className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-navy-500"
              />
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { setCountryCode(c.code); setOpen(false); setSearch('') }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors ${
                    c.code === countryCode ? 'bg-navy-50 text-navy-700 font-medium' : 'text-slate-700'
                  }`}
                >
                  <Flag iso={c.iso} />
                  <span className="flex-1">{c.name}</span>
                  <span className="text-slate-400 text-xs">+{c.code}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-4 text-sm text-slate-400 text-center">No results</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Number input — digits only */}
      <input
        type="text"
        inputMode="numeric"
        value={localNumber}
        onChange={handleNumber}
        placeholder={placeholder}
        required={required}
        className="input flex-1 min-w-0"
      />
    </div>
  )
}
