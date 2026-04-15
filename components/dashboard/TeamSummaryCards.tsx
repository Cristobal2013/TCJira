// components/dashboard/TeamSummaryCards.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TeamMetrics } from '@/types/jira'

interface Props {
  metrics: TeamMetrics
}

export function TeamSummaryCards({ metrics }: Props) {
  const cards = [
    { title: 'Abiertos', value: metrics.totalOpen, color: 'text-yellow-600' },
    { title: 'En Progreso', value: metrics.totalInProgress, color: 'text-blue-600' },
    { title: 'Cerrados', value: metrics.totalClosed, color: 'text-green-600' },
  ]

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map(c => (
        <Card key={c.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
