// types/jira.ts

// Jira puede devolver estados custom (ej: "In Review", "Blocked") además de los estándar
export type IssueStatus = string
// Jira puede devolver tipos custom definidos en el proyecto además de los estándar
export type IssueType = string

export interface JiraUser {
  accountId: string
  displayName: string
  avatarUrl: string
  emailAddress?: string
}

export interface JiraIssue {
  id: string
  key: string
  summary: string
  status: IssueStatus
  issueType: IssueType
  assignee: JiraUser | null  // null para tickets sin asignar (filtrado por JQL pero defensivo)
  created: string        // ISO 8601
  resolutionDate: string | null  // ISO 8601 or null if not resolved
}

export interface MemberMetrics {
  member: JiraUser
  open: number           // status = "To Do"
  inProgress: number     // status = "In Progress"
  closed: number         // status = "Done" (con o sin resolutionDate)
  avgResolutionDays: number | null   // null if no closed tickets
  byType: Record<string, number>     // { Bug: 2, Task: 5, Story: 1 }
}

export interface TeamMetrics {
  totalOpen: number
  totalInProgress: number
  totalClosed: number
  members: MemberMetrics[]
  byType: Record<string, number>
}

export interface IssueFilters {
  dateFrom?: string      // YYYY-MM-DD
  dateTo?: string        // YYYY-MM-DD
  issueType?: string     // 'Bug' | 'Task' | 'Story' | '' (all)
  status?: string        // 'To Do' | 'In Progress' | 'Done' | '' (all)
}
