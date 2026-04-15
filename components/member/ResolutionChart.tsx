// components/member/ResolutionChart.tsx
'use client'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444']

interface Props {
  byType: Record<string, number>
}

export function ResolutionChart({ byType }: Props) {
  const data = Object.entries(byType).map(([name, value]) => ({ name, value }))
  if (data.length === 0) return null

  return (
    <div>
      <h2 className="font-semibold text-lg mb-4">Distribución por tipo</h2>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
