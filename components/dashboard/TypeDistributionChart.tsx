// components/dashboard/TypeDistributionChart.tsx
'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  byType: Record<string, number>
}

export function TypeDistributionChart({ byType }: Props) {
  const data = Object.entries(byType).map(([name, count]) => ({ name, count }))

  if (data.length === 0) return null

  return (
    <div>
      <h2 className="font-semibold text-lg mb-4">Tickets por tipo</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
