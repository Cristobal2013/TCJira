// app/dashboard/page.tsx
'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { FilterPanel } from '@/components/dashboard/FilterPanel'
import { TeamSummaryCards } from '@/components/dashboard/TeamSummaryCards'
import { MemberList } from '@/components/dashboard/MemberList'
import { TypeDistributionChart } from '@/components/dashboard/TypeDistributionChart'
import { calculateTeamMetrics } from '@/lib/metrics'
import type { IssueFilters, JiraIssue } from '@/types/jira'

const REFRESH_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

function buildUrl(filters: IssueFilters, refresh = false) {
  const params = new URLSearchParams()
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) params.set('dateTo', filters.dateTo)
  if (filters.issueType) params.set('issueType', filters.issueType)
  if (filters.status) params.set('status', filters.status)
  if (refresh) params.set('refresh', 'true')
  const qs = params.toString()
  return `/api/jira/issues${qs ? `?${qs}` : ''}`
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function DashboardPage() {
  const [filters, setFilters] = useState<IssueFilters>({})
  const [forceRefresh, setForceRefresh] = useState(false)

  const url = buildUrl(filters, forceRefresh)
  const { data: issues, isLoading, mutate } = useSWR<JiraIssue[]>(url, fetcher, {
    refreshInterval: REFRESH_INTERVAL_MS,
    onSuccess: () => setForceRefresh(false),
  })

  const handleRefresh = () => {
    setForceRefresh(true)
    mutate()
  }

  const metrics = issues && Array.isArray(issues) ? calculateTeamMetrics(issues) : null

  return (
    <div className="flex gap-8">
      <FilterPanel
        filters={filters}
        onChange={setFilters}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />
      <div className="flex-1 space-y-8">
        {isLoading && <p className="text-muted-foreground">Cargando datos...</p>}
        {metrics && (
          <>
            <TeamSummaryCards metrics={metrics} />
            <MemberList members={metrics.members} />
            <TypeDistributionChart byType={metrics.byType} />
          </>
        )}
      </div>
    </div>
  )
}
