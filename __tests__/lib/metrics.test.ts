import { calculateTeamMetrics, calculateMemberMetrics, buildJql } from '@/lib/metrics'
import type { JiraIssue } from '@/types/jira'

const mockUser = {
  accountId: 'u1',
  displayName: 'Juan',
  avatarUrl: 'https://example.com/avatar.png',
}

const baseIssue: JiraIssue = {
  id: '1',
  key: 'PSTC-1',
  summary: 'Test issue',
  status: 'To Do',
  issueType: 'Task',
  assignee: mockUser,
  created: '2026-04-01T00:00:00.000Z',
  resolutionDate: null,
}

describe('calculateMemberMetrics', () => {
  it('counts open, inProgress and closed correctly', () => {
    const issues: JiraIssue[] = [
      { ...baseIssue, status: 'To Do' },
      { ...baseIssue, status: 'In Progress' },
      { ...baseIssue, status: 'Done', resolutionDate: '2026-04-06T00:00:00.000Z' },
      { ...baseIssue, status: 'Done', resolutionDate: '2026-04-11T00:00:00.000Z' },
    ]
    const result = calculateMemberMetrics(mockUser, issues)
    expect(result.open).toBe(1)
    expect(result.inProgress).toBe(1)
    expect(result.closed).toBe(2)
  })

  it('calculates avgResolutionDays correctly', () => {
    const issues: JiraIssue[] = [
      {
        ...baseIssue,
        status: 'Done',
        created: '2026-04-01T00:00:00.000Z',
        resolutionDate: '2026-04-06T00:00:00.000Z', // 5 days
      },
      {
        ...baseIssue,
        status: 'Done',
        created: '2026-04-01T00:00:00.000Z',
        resolutionDate: '2026-04-11T00:00:00.000Z', // 10 days
      },
    ]
    const result = calculateMemberMetrics(mockUser, issues)
    expect(result.avgResolutionDays).toBe(7.5)
  })

  it('returns null avgResolutionDays when no closed tickets', () => {
    const issues: JiraIssue[] = [{ ...baseIssue, status: 'To Do' }]
    const result = calculateMemberMetrics(mockUser, issues)
    expect(result.avgResolutionDays).toBeNull()
  })

  it('counts Done tickets without resolutionDate as closed', () => {
    const issues: JiraIssue[] = [{ ...baseIssue, status: 'Done', resolutionDate: null }]
    const result = calculateMemberMetrics(mockUser, issues)
    expect(result.closed).toBe(1)
    expect(result.avgResolutionDays).toBeNull()
  })

  it('counts byType correctly', () => {
    const issues: JiraIssue[] = [
      { ...baseIssue, issueType: 'Bug' },
      { ...baseIssue, issueType: 'Bug' },
      { ...baseIssue, issueType: 'Task' },
    ]
    const result = calculateMemberMetrics(mockUser, issues)
    expect(result.byType).toEqual({ Bug: 2, Task: 1 })
  })
})

describe('calculateTeamMetrics', () => {
  it('aggregates totals across all members', () => {
    const user2 = { ...mockUser, accountId: 'u2', displayName: 'Maria' }
    const issues: JiraIssue[] = [
      { ...baseIssue, assignee: mockUser, status: 'To Do' },
      { ...baseIssue, assignee: mockUser, status: 'In Progress' },
      { ...baseIssue, assignee: user2, status: 'Done', resolutionDate: '2026-04-06T00:00:00.000Z' },
    ]
    const result = calculateTeamMetrics(issues)
    expect(result.totalOpen).toBe(1)
    expect(result.totalInProgress).toBe(1)
    expect(result.totalClosed).toBe(1)
    expect(result.members).toHaveLength(2)
  })
})

describe('buildJql', () => {
  it('builds base JQL with no filters', () => {
    const jql = buildJql('PSTC', {})
    expect(jql).toContain('project = PSTC')
    expect(jql).toContain('assignee is not EMPTY')
  })

  it('adds dateFrom filter when provided', () => {
    const jql = buildJql('PSTC', { dateFrom: '2026-01-01' })
    expect(jql).toContain('created >= "2026-01-01"')
  })

  it('adds issueType filter when provided', () => {
    const jql = buildJql('PSTC', { issueType: 'Bug' })
    expect(jql).toContain('issuetype = "Bug"')
  })

  it('adds status filter when provided', () => {
    const jql = buildJql('PSTC', { status: 'In Progress' })
    expect(jql).toContain('status = "In Progress"')
  })
})
