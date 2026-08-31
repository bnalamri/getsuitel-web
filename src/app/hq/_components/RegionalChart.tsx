import { createClient } from '@/lib/supabase/server'

type RegionRow = { label: string; orgs: number; properties: number }

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="h-2 rounded-full bg-gray-100 overflow-hidden" style={{ minWidth: 80 }}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, minWidth: value > 0 ? 4 : 0 }} />
    </div>
  )
}

export default async function RegionalChart() {
  const supabase = await createClient()

  // Orgs per city/region (use city from branch)
  const { data: branches } = await supabase
    .from('branches')
    .select('id, city, region')
    .in('status', ['active', 'suspended'])

  if (!branches?.length) return null

  const branchIds = branches.map(b => b.id)

  // Org counts per branch
  const { data: orgRows } = await supabase
    .from('organizations')
    .select('branch_id')
    .in('branch_id', branchIds)

  // Property counts per branch (via branch_id on properties)
  const { data: propRows } = await supabase
    .from('properties')
    .select('branch_id')
    .in('branch_id', branchIds)

  // Build city→{orgs, properties} map
  const cityMap: Record<string, { orgs: number; properties: number }> = {}
  const cityFor: Record<string, string> = {}

  branches.forEach(b => {
    const label = b.city ?? b.region ?? 'Unknown'
    cityFor[b.id] = label
    if (!cityMap[label]) cityMap[label] = { orgs: 0, properties: 0 }
  })

  orgRows?.forEach(r => {
    if (!r.branch_id) return
    const city = cityFor[r.branch_id]
    if (city && cityMap[city]) cityMap[city].orgs++
  })

  propRows?.forEach(r => {
    if (!r.branch_id) return
    const city = cityFor[r.branch_id]
    if (city && cityMap[city]) cityMap[city].properties++
  })

  const rows: RegionRow[] = Object.entries(cityMap)
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.orgs - a.orgs)
    .slice(0, 10)

  if (rows.length === 0) return null

  const maxOrgs  = Math.max(...rows.map(r => r.orgs), 1)
  const maxProps = Math.max(...rows.map(r => r.properties), 1)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-gray-800">Regional Breakdown</h2>
          <p className="text-xs text-gray-400 mt-0.5">Organisations &amp; properties by city</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-blue-500 inline-block" />Orgs</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-yellow-400 inline-block" />Properties</span>
        </div>
      </div>

      <div className="space-y-4">
        {rows.map(r => (
          <div key={r.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700">{r.label}</span>
              <span className="text-gray-400">{r.orgs} orgs · {r.properties} props</span>
            </div>
            <Bar value={r.orgs}       max={maxOrgs}  color="bg-blue-500" />
            <Bar value={r.properties} max={maxProps} color="bg-yellow-400" />
          </div>
        ))}
      </div>
    </div>
  )
}
