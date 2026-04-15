// lib/metrics.ts
import type { JiraIssue, JiraUser, MemberMetrics, TeamMetrics, IssueFilters } from '@/types/jira'

export function calculateMemberMetrics(member: JiraUser, issues: JiraIssue[]): MemberMetrics {
  const open = issues.filter(i => i.status === 'To Do').length
  const inProgress = issues.filter(i => i.status === 'In Progress').length
  const closedIssues = issues.filter(i => i.status === 'Done')
  const resolvable = closedIssues.filter(i => i.resolutionDate !== null)

  const avgResolutionDays = resolvable.length === 0
    ? null
    : resolvable.reduce((sum, issue) => {
        const created = new Date(issue.created).getTime()
        const resolved = new Date(issue.resolutionDate!).getTime()
        return sum + (resolved - created) / (1000 * 60 * 60 * 24)
      }, 0) / resolvable.length

  const byType: Record<string, number> = {}
  for (const issue of issues) {
    byType[issue.issueType] = (byType[issue.issueType] ?? 0) + 1
  }

  return {
    member,
    open,
    inProgress,
    closed: closedIssues.length,
    avgResolutionDays: avgResolutionDays !== null ? Math.round(avgResolutionDays * 10) / 10 : null,
    byType,
  }
}

export function calculateTeamMetrics(issues: JiraIssue[]): TeamMetrics {
  const byMember = new Map<string, { user: JiraUser; issues: JiraIssue[] }>()
  for (const issue of issues) {
    if (!issue.assignee) continue
    const { accountId } = issue.assignee
    if (!byMember.has(accountId)) {
      byMember.set(accountId, { user: issue.assignee, issues: [] })
    }
    byMember.get(accountId)!.issues.push(issue)
  }

  const members = Array.from(byMember.values()).map(({ user, issues: memberIssues }) =>
    calculateMemberMetrics(user, memberIssues)
  )

  const byType: Record<string, number> = {}
  for (const issue of issues) {
    byType[issue.issueType] = (byType[issue.issueType] ?? 0) + 1
  }

  return {
    totalOpen: members.reduce((sum, m) => sum + m.open, 0),
    totalInProgress: members.reduce((sum, m) => sum + m.inProgress, 0),
    totalClosed: members.reduce((sum, m) => sum + m.closed, 0),
    members,
    byType,
  }
}

export function buildJql(projectKey: string, filters: IssueFilters): string {
  const clauses: string[] = [
    `project = ${projectKey}`,
    'assignee is not EMPTY',
  ]

  if (filters.dateFrom) clauses.push(`created >= "${filters.dateFrom}"`)
  if (filters.dateTo) clauses.push(`created <= "${filters.dateTo}"`)
  if (filters.issueType) clauses.push(`issuetype = "${filters.issueType}"`)
  if (filters.status) clauses.push(`status = "${filters.status}"`)

  return clauses.join(' AND ') + ' ORDER BY updated DESC'
}
