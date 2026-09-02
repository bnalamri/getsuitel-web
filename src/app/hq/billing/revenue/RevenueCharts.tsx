'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'

type Props = {
  data: Record<string, string | number>[]
  branches: string[]
  colors: string[]
}

export default function RevenueCharts({ data, branches, colors }: Props) {
  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: '#6B7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#6B7280' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => v === 0 ? '0' : Number(v).toFixed(0)}
        />
        <Tooltip
          formatter={(value: number, name: string) => [Number(value).toFixed(3), name]}
          contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
        />
        {branches.length > 1 && (
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        )}
        {branches.map((name, i) => (
          <Bar
            key={name}
            dataKey={name}
            fill={colors[i % colors.length]}
            radius={[3, 3, 0, 0]}
            maxBarSize={40}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
