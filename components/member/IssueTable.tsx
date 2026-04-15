// components/member/IssueTable.tsx
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { JiraIssue } from '@/types/jira'

interface Props {
  issues: JiraIssue[]
}

const STATUS_COLORS: Record<string, string> = {
  'To Do': 'text-yellow-600',
  'In Progress': 'text-blue-600',
  'Done': 'text-green-600',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function IssueTable({ issues }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Clave</TableHead>
          <TableHead>Resumen</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Creado</TableHead>
          <TableHead>Resuelto</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {issues.map(issue => (
          <TableRow key={issue.id}>
            <TableCell className="font-mono text-sm">{issue.key}</TableCell>
            <TableCell className="max-w-xs truncate">{issue.summary}</TableCell>
            <TableCell>
              <Badge variant="outline">{issue.issueType}</Badge>
            </TableCell>
            <TableCell className={STATUS_COLORS[issue.status] ?? ''}>{issue.status}</TableCell>
            <TableCell className="text-sm">{formatDate(issue.created)}</TableCell>
            <TableCell className="text-sm">{formatDate(issue.resolutionDate)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
