// app/dashboard/[member]/page.tsx
'use client'
import { use } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { IssueTable } from '@/components/member/IssueTable'
import { ResolutionChart } from '@/components/member/ResolutionChart'
import { calculateMemberMetrics } from '@/lib/metrics'
import type { JiraIssue, JiraUser } from '@/types/jira'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface PageProps {
  params: Promise<{ member: string }>
}

export default function MemberPage({ params }: PageProps) {
  const { member: accountId } = use(params)
  const { data: allIssues, isLoading } = useSWR<JiraIssue[]>('/api/jira/issues', fetcher)

  const memberIssues = (allIssues && Array.isArray(allIssues))
    ? allIssues.filter(i => i.assignee?.accountId === accountId)
    : []

  const member: JiraUser | undefined = memberIssues.find(i => i.assignee != null)?.assignee ?? undefined
  const metrics = member ? calculateMemberMetrics(member, memberIssues) : null

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">← Volver</Link>
        </Button>
        {member && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={member.avatarUrl} alt={member.displayName} className="w-10 h-10 rounded-full" />
            <div>
              <h1 className="font-bold text-xl">{member.displayName}</h1>
              {metrics?.avgResolutionDays !== null && (
                <p className="text-sm text-muted-foreground">
                  Tiempo promedio de resolución: {metrics?.avgResolutionDays} días
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando tickets...</p>}

      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-semibold text-lg">Tickets ({memberIssues.length})</h2>
            <IssueTable issues={memberIssues} />
          </div>
          <div>
            <ResolutionChart byType={metrics.byType} />
          </div>
        </div>
      )}
    </div>
  )
}
