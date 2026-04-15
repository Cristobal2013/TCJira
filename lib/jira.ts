// lib/jira.ts
import type { JiraIssue, JiraUser } from '@/types/jira'

const JIRA_DOMAIN = process.env.JIRA_DOMAIN!
const FIELDS = 'summary,status,issuetype,assignee,created,resolutiondate'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapIssue(raw: any): JiraIssue {
  const { fields } = raw

  const assignee: JiraUser | null = fields.assignee
    ? {
        accountId: fields.assignee.accountId,
        displayName: fields.assignee.displayName,
        avatarUrl: fields.assignee.avatarUrls?.['48x48'] ?? '',
        emailAddress: fields.assignee.emailAddress,
      }
    : null

  return {
    id: raw.id,
    key: raw.key,
    summary: fields.summary,
    status: fields.status.name,
    issueType: fields.issuetype.name,
    assignee,
    created: fields.created,
    resolutionDate: fields.resolutiondate ?? null,
  }
}

let cachedCloudId: string | null = null

export async function getCloudId(accessToken: string): Promise<string> {
  if (cachedCloudId) return cachedCloudId

  const res = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  })

  if (!res.ok) throw new Error(`Failed to fetch accessible resources: ${res.status}`)

  const sites: Array<{ id: string; url: string }> = await res.json()
  const site = sites.find(s => s.url.includes(JIRA_DOMAIN))

  if (!site) throw new Error(`Jira site not found for domain: ${JIRA_DOMAIN}`)

  cachedCloudId = site.id
  return cachedCloudId
}

export async function searchIssues(
  accessToken: string,
  jql: string,
  maxResults = 500
): Promise<JiraIssue[]> {
  const cloudId = await getCloudId(accessToken)
  const base = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`
  const params = new URLSearchParams({
    jql,
    fields: FIELDS,
    maxResults: String(maxResults),
  })

  const res = await fetch(`${base}/search?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  })

  if (!res.ok) throw new Error(`Jira search failed: ${res.status}`)

  const data = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.issues as any[]).map(mapIssue)
}
