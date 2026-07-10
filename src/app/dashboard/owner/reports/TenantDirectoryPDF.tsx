'use client'
import { Users, Download } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtAmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' OMR'
}

const STATUS_COLORS: Record<string, string> = {
  active: 'color:#15803d;background:#dcfce7',
  expired: 'color:#475569;background:#f1f5f9',
  terminated: 'color:#b91c1c;background:#fee2e2',
}

export default function TenantDirectoryPDF({
  tenants,
  printDate,
}: {
  tenants: AnyRow[]
  printDate: string
}) {
  const dash = '—'

  function handleSavePDF() {
    // Build the active contract for each tenant
    const rows = tenants.map((t) => {
      const activeContract = (t.contracts as AnyRow[] | null)?.find(
        (c) => c.status === 'active'
      ) ?? (t.contracts as AnyRow[] | null)?.[0] ?? null

      const property = activeContract?.units?.properties?.name ?? dash
      const unit = activeContract?.units?.unit_number ?? dash
      const contractStatus = activeContract?.status ?? dash
      const startDate = activeContract?.start_date ? fmtDate(activeContract.start_date) : dash
      const endDate = activeContract?.end_date ? fmtDate(activeContract.end_date) : dash
      const rent = activeContract?.rent_amount ? fmtAmt(Number(activeContract.rent_amount)) : dash
      const statusStyle = activeContract?.status ? (STATUS_COLORS[activeContract.status] ?? '') : ''

      return { t, property, unit, contractStatus, startDate, endDate, rent, statusStyle }
    })

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Tenant Directory — GetSuitel</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #1B3A6B; padding-bottom: 12px; }
    .logo { font-size: 20px; font-weight: 900; color: #1B3A6B; }
    .logo span { color: #b8972f; }
    .meta { text-align: right; font-size: 10px; color: #64748b; }
    h2 { font-size: 14px; font-weight: 700; color: #1B3A6B; margin-bottom: 4px; }
    .sub { font-size: 10px; color: #64748b; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1B3A6B; color: white; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
    td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 7px; border-radius: 99px; font-size: 9px; font-weight: 600; text-transform: capitalize; }
    .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Get<span>Suitel</span></div>
      <div style="font-size:10px;color:#64748b;margin-top:2px">SMART REAL ESTATE MANAGEMENT</div>
    </div>
    <div class="meta">
      <div><strong>Tenant Directory</strong></div>
      <div>Generated: ${printDate}</div>
      <div>${tenants.length} tenant${tenants.length !== 1 ? 's' : ''}</div>
    </div>
  </div>

  <h2>Tenant Directory</h2>
  <div class="sub">Personal information and contract details for all registered tenants</div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Full Name</th>
        <th>Email</th>
        <th>Phone</th>
        <th>Nationality</th>
        <th>National ID</th>
        <th>Emergency Contact</th>
        <th>Property</th>
        <th>Unit</th>
        <th>Contract Status</th>
        <th>Start Date</th>
        <th>End Date</th>
        <th>Monthly Rent</th>
      </tr>
    </thead>
    <tbody>
      ${rows.length === 0
        ? `<tr><td colspan="13" style="text-align:center;padding:20px;color:#94a3b8;font-style:italic">No tenants found</td></tr>`
        : rows.map(({ t, property, unit, contractStatus, startDate, endDate, rent, statusStyle }, idx) => `
        <tr>
          <td style="color:#94a3b8;font-family:monospace">${idx + 1}</td>
          <td style="font-weight:600">${t.full_name ?? dash}</td>
          <td style="color:#475569">${t.email ?? dash}</td>
          <td>${t.phone ?? dash}</td>
          <td>${t.nationality ?? dash}</td>
          <td style="font-family:monospace">${t.national_id ?? dash}</td>
          <td>${t.emergency_contact ?? dash}</td>
          <td style="font-weight:500">${property}</td>
          <td>${unit}</td>
          <td>${contractStatus !== dash ? `<span class="badge" style="${statusStyle}">${contractStatus}</span>` : dash}</td>
          <td style="white-space:nowrap">${startDate}</td>
          <td style="white-space:nowrap">${endDate}</td>
          <td style="font-weight:600;white-space:nowrap">${rent}</td>
        </tr>`).join('')}
    </tbody>
  </table>

  <div class="footer">GetSuitel Property Management &nbsp;•&nbsp; Confidential &nbsp;•&nbsp; ${printDate}</div>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-slate-500"><Users size={16} /></span>
          <div>
            <h3 className="font-semibold text-slate-900">Tenant Directory</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Personal info and contract details — {tenants.length} tenant{tenants.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={handleSavePDF}
          className="no-print flex items-center gap-1.5 text-xs font-medium text-white bg-navy-700 hover:bg-navy-800 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Download size={13} />
          Save as PDF
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {['#', 'Full Name', 'Email', 'Phone', 'Nationality', 'National ID', 'Emergency Contact',
                'Property', 'Unit', 'Contract', 'Start', 'End', 'Rent / mo'].map(h => (
                <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 bg-slate-50 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-3 py-5 text-center text-slate-400 text-sm italic">
                  No tenants found
                </td>
              </tr>
            ) : tenants.map((t, idx) => {
              const activeContract = (t.contracts as AnyRow[] | null)?.find(
                (c) => c.status === 'active'
              ) ?? (t.contracts as AnyRow[] | null)?.[0] ?? null

              const property = activeContract?.units?.properties?.name ?? dash
              const unit = activeContract?.units?.unit_number ?? dash
              const contractStatus = activeContract?.status
              const startDate = activeContract?.start_date ? fmtDate(activeContract.start_date) : dash
              const endDate = activeContract?.end_date ? fmtDate(activeContract.end_date) : dash
              const rent = activeContract?.rent_amount ? fmtAmt(Number(activeContract.rent_amount)) : dash

              const statusColors: Record<string, string> = {
                active: 'bg-emerald-100 text-emerald-700',
                expired: 'bg-slate-100 text-slate-600',
                terminated: 'bg-red-100 text-red-700',
              }

              return (
                <tr key={t.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                  <td className="px-3 py-2.5 text-xs text-slate-400 font-mono border-b border-slate-100">{idx + 1}</td>
                  <td className="px-3 py-2.5 text-sm font-semibold text-slate-900 border-b border-slate-100 whitespace-nowrap">{t.full_name ?? dash}</td>
                  <td className="px-3 py-2.5 text-sm text-slate-500 border-b border-slate-100">{t.email ?? dash}</td>
                  <td className="px-3 py-2.5 text-sm text-slate-700 border-b border-slate-100 whitespace-nowrap">{t.phone ?? dash}</td>
                  <td className="px-3 py-2.5 text-sm text-slate-700 border-b border-slate-100">{t.nationality ?? dash}</td>
                  <td className="px-3 py-2.5 text-sm font-mono text-slate-600 border-b border-slate-100">{t.national_id ?? dash}</td>
                  <td className="px-3 py-2.5 text-sm text-slate-700 border-b border-slate-100 whitespace-nowrap">{t.emergency_contact ?? dash}</td>
                  <td className="px-3 py-2.5 text-sm font-medium text-slate-900 border-b border-slate-100">{property}</td>
                  <td className="px-3 py-2.5 text-sm text-slate-700 border-b border-slate-100">{unit}</td>
                  <td className="px-3 py-2.5 border-b border-slate-100">
                    {contractStatus ? (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[contractStatus] ?? 'bg-slate-100 text-slate-600'}`}>
                        {contractStatus}
                      </span>
                    ) : <span className="text-slate-300 text-sm">{dash}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-slate-700 border-b border-slate-100 whitespace-nowrap">{startDate}</td>
                  <td className="px-3 py-2.5 text-sm text-slate-700 border-b border-slate-100 whitespace-nowrap">{endDate}</td>
                  <td className="px-3 py-2.5 text-sm font-semibold text-slate-900 border-b border-slate-100 whitespace-nowrap">{rent}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
