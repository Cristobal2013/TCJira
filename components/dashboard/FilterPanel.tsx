// components/dashboard/FilterPanel.tsx
'use client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { IssueFilters } from '@/types/jira'

interface FilterPanelProps {
  filters: IssueFilters
  onChange: (filters: IssueFilters) => void
  onRefresh: () => void
  isLoading: boolean
}

const ISSUE_TYPES = ['', 'Bug', 'Task', 'Story']
const STATUSES = ['', 'To Do', 'In Progress', 'Done']
const DATE_RANGES = [
  { label: 'Todo', value: '' },
  { label: 'Última semana', value: '7' },
  { label: 'Último mes', value: '30' },
  { label: 'Últimos 3 meses', value: '90' },
]

function getDateFrom(days: string): string | undefined {
  if (!days) return undefined
  const date = new Date()
  date.setDate(date.getDate() - parseInt(days))
  return date.toISOString().split('T')[0]
}

export function FilterPanel({ filters, onChange, onRefresh, isLoading }: FilterPanelProps) {
  return (
    <aside className="w-56 shrink-0 space-y-4">
      <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Filtros</h2>

      <div className="space-y-2">
        <label className="text-sm font-medium">Período</label>
        <Select
          value={''}
          onValueChange={val => onChange({ ...filters, dateFrom: getDateFrom(val ?? '') })}
        >
          <SelectTrigger><SelectValue placeholder="Todo" /></SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map(r => (
              <SelectItem key={r.value} value={r.value || '_all'}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Tipo</label>
        <Select
          value={filters.issueType ?? '_all'}
          onValueChange={val => onChange({ ...filters, issueType: (val == null || val === '_all') ? undefined : val })}
        >
          <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            {ISSUE_TYPES.map(t => (
              <SelectItem key={t || '_all'} value={t || '_all'}>{t || 'Todos'}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Estado</label>
        <Select
          value={filters.status ?? '_all'}
          onValueChange={val => onChange({ ...filters, status: (val == null || val === '_all') ? undefined : val })}
        >
          <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => (
              <SelectItem key={s || '_all'} value={s || '_all'}>{s || 'Todos'}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={onRefresh} disabled={isLoading} className="w-full">
        {isLoading ? 'Actualizando...' : 'Actualizar'}
      </Button>
    </aside>
  )
}
