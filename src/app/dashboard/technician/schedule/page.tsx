import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'

export const metadata = { title: 'Schedule' }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const priorityDot: Record<string, string> = {
  urgent: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-blue-400', low: 'bg-slate-300',
}
const priorityBorder: Record<string, string> = {
  urgent: 'border-l-red-500', high: 'border-l-orange-500', medium: 'border-l-blue-400', low: 'border-l-slate-300',
}

function fmtMonth(y: number, m: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}`
}

export default async function TechnicianSchedulePage({
  searchParams,
}: {
  searchParams: { month?: string; date?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Parse month
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  let year = now.getFullYear()
  let month = now.getMonth()
  if (searchParams.month) {
    const [y, m] = searchParams.month.split('-').map(Number)
    year = y; month = m - 1
  }
  const selectedDate = searchParams.date ?? todayStr

  // Fetch all active jobs
  const { data: orders } = await supabase
    .from('maintenance_requests')
    .select('*, units(unit_number, properties(name))')
    .eq('technician_id', user.id)
    .in('status', ['open', 'assigned', 'in_progress'])
    .order('created_at', { ascending: true })

  const allJobs = orders ?? []

  // Group by scheduled_date — slice to 10 chars to normalize timestamp vs date format
  const byDate = new Map<string, typeof allJobs>()
  const unscheduled: typeof allJobs = []
  for (const job of allJobs) {
    const d = (job.scheduled_date as string | null)?.substring(0, 10) ?? null
    if (d) {
      if (!byDate.has(d)) byDate.set(d, [])
      byDate.get(d)!.push(job)
    } else {
      unscheduled.push(job)
    }
  }

  // Calendar math
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDate = new Date(year, month - 1, 1)
  const nextDate = new Date(year, month + 1, 1)
  const prevMonth = fmtMonth(prevDate.getFullYear(), prevDate.getMonth())
  const nextMonth = fmtMonth(nextDate.getFullYear(), nextDate.getMonth())
  const currentMonthStr = fmtMonth(year, month)

  const selectedJobs = byDate.get(selectedDate) ?? []

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Schedule</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          {allJobs.length} active · {unscheduled.length} unscheduled
        </p>
      </div>

      {/* Calendar card */}
      <div className="card p-5">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <a
            href={`?month=${prevMonth}&date=${selectedDate}`}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ChevronLeft size={18} />
          </a>
          <h3 className="font-semibold text-slate-800">{MONTHS[month]} {year}</h3>
          <a
            href={`?month=${nextMonth}&date=${selectedDate}`}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ChevronRight size={18} />
          </a>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
          ))}
        </div>

        {/* Date grid */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${currentMonthStr}-${String(day).padStart(2, '0')}`
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const jobs = byDate.get(dateStr) ?? []
            const dots = jobs.slice(0, 3).map(j => j.priority as string)

            return (
              <a
                key={day}
                href={`?month=${currentMonthStr}&date=${dateStr}`}
                className={`flex flex-col items-center py-1.5 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-orange-700 text-white'
                    : isToday
                    ? 'bg-orange-50 text-orange-700 font-semibold'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-sm leading-none">{day}</span>
                {jobs.length > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {dots.map((p, idx) => (
                      <div
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : (priorityDot[p] ?? 'bg-slate-400')}`}
                      />
                    ))}
                    {jobs.length > 3 && (
                      <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white opacity-50' : 'bg-slate-400'}`} />
                    )}
                  </div>
                )}
              </a>
            )
          })}
        </div>
      </div>

      {/* Jobs for selected date */}
      <div>
        <h3 className="font-semibold text-slate-700 mb-3">
          {selectedDate === todayStr
            ? 'Today'
            : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
                weekday: 'long', day: '2-digit', month: 'long',
              })}
          {selectedJobs.length > 0 && (
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({selectedJobs.length} job{selectedJobs.length !== 1 ? 's' : ''})
            </span>
          )}
        </h3>

        {selectedJobs.length === 0 ? (
          <div className="card p-8 text-center">
            <Calendar size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-400 text-sm">No jobs scheduled for this date</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedJobs.map(order => {
              const unit = order.units as { unit_number: string; properties: { name: string } | null } | null
              return (
                <a
                  key={order.id}
                  href={`/dashboard/technician/orders/${order.id}`}
                  className={`card block p-4 border-l-4 ${priorityBorder[order.priority] ?? 'border-l-slate-300'} hover:shadow-md transition-shadow`}
                >
                  <div className="font-semibold text-slate-900">{order.title}</div>
                  <div className="text-sm text-slate-500 mt-0.5 capitalize">
                    {order.category} · {(order.status as string).replace('_', ' ')}
                  </div>
                  {unit && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                      <MapPin size={11} />
                      <span>{unit.properties?.name} · Unit {unit.unit_number}</span>
                    </div>
                  )}
                </a>
              )
            })}
          </div>
        )}
      </div>

      {/* Unscheduled */}
      {unscheduled.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-700 mb-3">
            Unscheduled
            <span className="ml-2 text-sm font-normal text-slate-400">({unscheduled.length})</span>
          </h3>
          <div className="space-y-3">
            {unscheduled.map(order => {
              const unit = order.units as { unit_number: string; properties: { name: string } | null } | null
              return (
                <a
                  key={order.id}
                  href={`/dashboard/technician/orders/${order.id}`}
                  className={`card block p-4 border-l-4 border-dashed ${priorityBorder[order.priority] ?? 'border-l-slate-300'} hover:shadow-md transition-shadow`}
                >
                  <div className="font-semibold text-slate-900">{order.title}</div>
                  <div className="text-sm text-slate-500 mt-0.5 capitalize">
                    {order.category} · {(order.status as string).replace('_', ' ')}
                  </div>
                  {unit && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                      <MapPin size={11} />
                      <span>{unit.properties?.name} · Unit {unit.unit_number}</span>
                    </div>
                  )}
                </a>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
