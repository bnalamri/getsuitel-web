'use client'

import { useState } from 'react'
import { Download, Loader2, FileSpreadsheet, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type BranchSummary = {
  id: string
  name: string
  totalRevenue: number
  totalShare: number
  totalLicense: number
  collected: number
  pending: number
  overdue: number
}

type Props = {
  branches: BranchSummary[]
  grandTotalRevenue: number
  grandTotalShare: number
  grandTotalLicense: number
  grandCollected: number
  grandPending: number
  grandOverdue: number
  chartData: Record<string, string | number>[]
}

export default function RevenueExportButtons({
  branches, grandTotalRevenue, grandTotalShare, grandTotalLicense, grandCollected, grandPending, grandOverdue, chartData,
}: Props) {
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)

  // ── Excel ────────────────────────────────────────────────────────────────
  function exportExcel() {
    setExporting('excel')
    try {
      const wb = XLSX.utils.book_new()

      // Sheet 1: P&L Summary
      const summaryRows = [
        ['Branch', 'Total Revenue (OMR)', 'HQ Share (OMR)', 'License Fee (OMR)', 'Collected (OMR)', 'Pending (OMR)', 'Overdue 7d+ (OMR)'],
        ...branches.map(b => [
          b.name,
          b.totalRevenue.toFixed(3),
          b.totalShare.toFixed(3),
          b.totalLicense.toFixed(3),
          b.collected.toFixed(3),
          b.pending.toFixed(3),
          b.overdue.toFixed(3),
        ]),
        ['TOTAL',
          grandTotalRevenue.toFixed(3),
          grandTotalShare.toFixed(3),
          grandTotalLicense.toFixed(3),
          grandCollected.toFixed(3),
          grandPending.toFixed(3),
          grandOverdue.toFixed(3),
        ],
      ]
      const ws1 = XLSX.utils.aoa_to_sheet(summaryRows)
      ws1['!cols'] = [{ wch: 36 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }]
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

      // Summary KPI row
      doc.setTextColor(31, 41, 55)
      doc.setFontSize(8)
      const kpis = [
        { label: 'Total Revenue', value: grandTotalRevenue.toFixed(3) + ' OMR' },
        { label: 'HQ Share',      value: grandTotalShare.toFixed(3) + ' OMR' },
        { label: 'License Fees',  value: grandTotalLicense.toFixed(3) + ' OMR' },
        { label: 'Collected',     value: grandCollected.toFixed(3) + ' OMR' },
        { label: 'Pending',       value: grandPending.toFixed(3) + ' OMR' },
        { label: 'Overdue 7d+',   value: grandOverdue.toFixed(3) + ' OMR' },
      ]
      kpis.forEach((k, i) => {
        const x = 14 + i * 47
        doc.setFillColor(249, 250, 251)
        doc.roundedRect(x, 24, 44, 14, 2, 2, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text(k.value, x + 22, 30, { align: 'center' })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(107, 114, 128)
        doc.text(k.label, x + 22, 35, { align: 'center' })
        doc.setTextColor(31, 41, 55)
      })

      // P&L Table
      autoTable(doc, {
        startY: 44,
        head: [['Branch', 'Revenue (OMR)', 'HQ Share (OMR)', 'License (OMR)', 'Collected (OMR)', 'Pending (OMR)', 'Overdue 7d+ (OMR)']],
        body: [
          ...branches.map(b => [
            b.name,
            b.totalRevenue.toFixed(3),
            b.totalShare.toFixed(3),
            b.totalLicense.toFixed(3),
            b.collected.toFixed(3),
            b.pending.toFixed(3),
            b.overdue.toFixed(3),
          ]),
          ['TOTAL',
            grandTotalRevenue.toFixed(3),
            grandTotalShare.toFixed(3),
            grandTotalLicense.toFixed(3),
            grandCollected.toFixed(3),
            grandPending.toFixed(3),
            grandOverdue.toFixed(3),
          ],
        ],
        headStyles: { fillColor: [31, 41, 55], textColor: [251, 191, 36], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [31, 41, 55] },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right', textColor: [22, 163, 74] },
          5: { halign: 'right', textColor: [220, 38, 38] },
          6: { halign: 'right', textColor: [153, 27, 27] },
        },
        didParseCell: (data) => {
          // Bold totals row
          if (data.row.index === branches.length) {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fillColor = [243, 244, 246]
          }
        },
      })

      // Monthly trend table (if available)
      if (chartData.length > 0) {
        const branchNames = Object.keys(chartData[0]).filter(k => k !== 'month')
        const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('Revenue Trend — Last 12 Months', 14, finalY)
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
