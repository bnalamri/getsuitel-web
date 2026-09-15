'use client'

import { useState } from 'react'
import { Download, Loader2, FileSpreadsheet, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type BranchSummary = {
  id: string
  name: string
  currency: string
  totalRevenue: number
  totalShare: number
  totalLicense: number
  shareCollected: number
  sharePending: number
  shareOverdue: number
  licenseCollected: number
  licensePending: number
  licenseOverdue: number
}

type Props = {
  branches: BranchSummary[]
  // License fee is always a flat OMR fee, so it's safe to sum across every
  // branch. Revenue/share now travel in each branch's own currency (see
  // 20260915l_branch_currency.sql) and are grouped by currency instead —
  // blending SAR/AED/OMR into one number would be meaningless.
  grandTotalLicense: number
  grandLicenseCollected: number
  grandLicensePending: number
  grandLicenseOverdue: number
  revenueByCurrency: Record<string, number>
  shareByCurrency: Record<string, number>
  shareCollectedByCurrency: Record<string, number>
  sharePendingByCurrency: Record<string, number>
  shareOverdueByCurrency: Record<string, number>
  chartData: Record<string, string | number>[]
}

export default function RevenueExportButtons({
  branches, grandTotalLicense, grandLicenseCollected, grandLicensePending, grandLicenseOverdue,
  revenueByCurrency, shareByCurrency, shareCollectedByCurrency, sharePendingByCurrency, shareOverdueByCurrency,
  chartData,
}: Props) {
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)

  // ── Excel ────────────────────────────────────────────────────────────────
  function exportExcel() {
    setExporting('excel')
    try {
      const wb = XLSX.utils.book_new()

      // Sheet 1: P&L Summary — Revenue/Share are in each branch's own
      // currency (Currency column), License Fee is always OMR. Per-branch
      // rows never mix currencies since one branch = one currency; the
      // TOTAL rows are broken out per currency instead of blended.
      const summaryRows: (string | number)[][] = [
        ['Branch', 'Currency', 'Total Revenue', 'HQ Share', 'License Fee (OMR)', 'Share Collected', 'Share Pending', 'Share Overdue 7d+', 'License Collected (OMR)', 'License Pending (OMR)', 'License Overdue 7d+ (OMR)'],
        ...branches.map(b => [
          b.name,
          b.currency,
          b.totalRevenue.toFixed(3),
          b.totalShare.toFixed(3),
          b.totalLicense.toFixed(3),
          b.shareCollected.toFixed(3),
          b.sharePending.toFixed(3),
          b.shareOverdue.toFixed(3),
          b.licenseCollected.toFixed(3),
          b.licensePending.toFixed(3),
          b.licenseOverdue.toFixed(3),
        ]),
        ...Object.keys(revenueByCurrency).map(c => [
          `TOTAL (${c})`,
          c,
          (revenueByCurrency[c] ?? 0).toFixed(3),
          (shareByCurrency[c] ?? 0).toFixed(3),
          '',
          (shareCollectedByCurrency[c] ?? 0).toFixed(3),
          (sharePendingByCurrency[c] ?? 0).toFixed(3),
          (shareOverdueByCurrency[c] ?? 0).toFixed(3),
          '', '', '',
        ]),
        ['TOTAL LICENSE FEE (OMR)', 'OMR', '', '', grandTotalLicense.toFixed(3), '', '', '',
          grandLicenseCollected.toFixed(3), grandLicensePending.toFixed(3), grandLicenseOverdue.toFixed(3)],
      ]
      const ws1 = XLSX.utils.aoa_to_sheet(summaryRows)
      ws1['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 20 }]
      XLSX.utils.book_append_sheet(wb, ws1, 'P&L Summary')

      // Sheet 2: Monthly Revenue Trend
      if (chartData.length > 0) {
        const branchNames = Object.keys(chartData[0]).filter(k => k !== 'month')
        const trendRows = [
          ['Month', ...branchNames],
          ...chartData.map(row => [row['month'], ...branchNames.map(b => Number(row[b]).toFixed(3))]),
        ]
        const ws2 = XLSX.utils.aoa_to_sheet(trendRows)
        ws2['!cols'] = [{ wch: 12 }, ...branchNames.map(() => ({ wch: 18 }))]
        XLSX.utils.book_append_sheet(wb, ws2, 'Revenue Trend')
      }

      const date = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `getsuitel-revenue-overview-${date}.xlsx`)
    } finally {
      setExporting(null)
    }
  }

  // ── PDF ──────────────────────────────────────────────────────────────────
  function exportPDF() {
    setExporting('pdf')
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

      // Header
      doc.setFillColor(31, 41, 55)
      doc.rect(0, 0, 297, 20, 'F')
      doc.setTextColor(251, 191, 36)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('GETSUITEL HQ', 14, 8)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(13)
      doc.text('Revenue Overview — Cross-Branch P&L Summary', 14, 15)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generated: ${date}`, 283, 15, { align: 'right' })

      // Summary KPI row — license fee is always OMR (safe to blend); revenue
      // is broken out per currency instead of summed across branches.
      doc.setTextColor(31, 41, 55)
      doc.setFontSize(8)
      const kpis = [
        ...Object.entries(revenueByCurrency).map(([c, v]) => ({ label: `Revenue (${c})`, value: v.toFixed(3) + ' ' + c })),
        { label: 'License Fees',  value: grandTotalLicense.toFixed(3) + ' OMR' },
        { label: 'License Collected', value: grandLicenseCollected.toFixed(3) + ' OMR' },
        { label: 'License Pending',   value: grandLicensePending.toFixed(3) + ' OMR' },
        { label: 'License Overdue 7d+', value: grandLicenseOverdue.toFixed(3) + ' OMR' },
      ]
      kpis.forEach((k, i) => {
        const x = 14 + (i % 6) * 47
        const rowY = Math.floor(i / 6) * 16
        doc.setFillColor(249, 250, 251)
        doc.roundedRect(x, 24 + rowY, 44, 14, 2, 2, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text(k.value, x + 22, 30 + rowY, { align: 'center' })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(107, 114, 128)
        doc.text(k.label, x + 22, 35 + rowY, { align: 'center' })
        doc.setTextColor(31, 41, 55)
      })

      const kpiRows = Math.ceil(kpis.length / 6)
      const tableStartY = 24 + kpiRows * 16 + 6

      // P&L Table — Revenue/HQ Share/Share Collected-Pending-Overdue are in
      // each branch's own currency (Currency column); License columns are
      // always OMR. Per-currency totals replace the old single blended row.
      autoTable(doc, {
        startY: tableStartY,
        head: [['Branch', 'Cur.', 'Revenue', 'HQ Share', 'License (OMR)', 'Share Collected', 'Share Pending', 'Share Overdue 7d+']],
        body: [
          ...branches.map(b => [
            b.name,
            b.currency,
            b.totalRevenue.toFixed(3),
            b.totalShare.toFixed(3),
            b.totalLicense.toFixed(3),
            b.shareCollected.toFixed(3),
            b.sharePending.toFixed(3),
            b.shareOverdue.toFixed(3),
          ]),
          ...Object.keys(revenueByCurrency).map(c => [
            `TOTAL (${c})`, c,
            (revenueByCurrency[c] ?? 0).toFixed(3),
            (shareByCurrency[c] ?? 0).toFixed(3),
            '',
            (shareCollectedByCurrency[c] ?? 0).toFixed(3),
            (sharePendingByCurrency[c] ?? 0).toFixed(3),
            (shareOverdueByCurrency[c] ?? 0).toFixed(3),
          ]),
        ],
        headStyles: { fillColor: [31, 41, 55], textColor: [251, 191, 36], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [31, 41, 55] },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 14 },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right', textColor: [22, 163, 74] },
          6: { halign: 'right', textColor: [220, 38, 38] },
          7: { halign: 'right', textColor: [153, 27, 27] },
        },
        didParseCell: (data) => {
          // Bold every TOTAL (per-currency) row
          if (data.row.index >= branches.length) {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fillColor = [243, 244, 246]
          }
        },
      })

      // License Fee summary — always OMR, so a single small table is valid
      {
        const licenseY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('License Fees (OMR)', 14, licenseY)
        autoTable(doc, {
          startY: licenseY + 4,
          head: [['Total License Fee', 'Collected', 'Pending', 'Overdue 7d+']],
          body: [[
            grandTotalLicense.toFixed(3),
            grandLicenseCollected.toFixed(3),
            grandLicensePending.toFixed(3),
            grandLicenseOverdue.toFixed(3),
          ]],
          headStyles: { fillColor: [31, 41, 55], textColor: [251, 191, 36], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, textColor: [31, 41, 55], fontStyle: 'bold' },
          columnStyles: {
            0: { halign: 'right' }, 1: { halign: 'right', textColor: [22, 163, 74] },
            2: { halign: 'right', textColor: [220, 38, 38] }, 3: { halign: 'right', textColor: [153, 27, 27] },
          },
        })
      }

      // Monthly trend table (if available)
      if (chartData.length > 0) {
        const branchNames = Object.keys(chartData[0]).filter(k => k !== 'month')
        const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('Revenue Trend — Last 12 Months (each branch in its own currency)', 14, finalY)
        autoTable(doc, {
          startY: finalY + 4,
          head: [['Month', ...branchNames]],
          body: chartData.map(row => [row['month'] as string, ...branchNames.map(b => Number(row[b]).toFixed(3))]),
          headStyles: { fillColor: [31, 41, 55], textColor: [251, 191, 36], fontStyle: 'bold', fontSize: 7 },
          bodyStyles: { fontSize: 7 },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          columnStyles: Object.fromEntries(
            branchNames.map((_, i) => [i + 1, { halign: 'right' as const }])
          ),
        })
      }

      doc.save(`getsuitel-revenue-overview-${new Date().toISOString().slice(0, 10)}.pdf`)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={exportExcel}
        disabled={!!exporting}
        className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 hover:bg-green-50 hover:text-green-700 hover:border-green-200 disabled:opacity-50 transition-colors"
      >
        {exporting === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
        Excel
      </button>
      <button
        onClick={exportPDF}
        disabled={!!exporting}
        className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 disabled:opacity-50 transition-colors"
      >
        {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        PDF
      </button>
    </div>
  )
}
