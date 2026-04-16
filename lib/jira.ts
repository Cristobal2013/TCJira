// lib/jira.ts
import type { JiraIssue, JiraUser } from '@/types/jira'

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

// Cache a nivel módulo — persiste por la vida del proceso del servidor.
// Un solo tenant soportado por instancia.
let cachedCloudId: string | null = null

/** Solo para testing — resetea el cache del cloudId */
export function _resetCloudIdCache() {
  cachedCloudId = null
}

export async function getCloudId(accessToken: string): Promise<string> {
  if (cachedCloudId) return cachedCloudId

  const res = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  })

  if (!res.ok) throw new Error(`Failed to fetch accessible resources: ${res.status}`)

  const domain = process.env.JIRA_DOMAIN!
  const sites: Array<{ id: string; url: string }> = await res.json()
  const site = sites.find(s => s.url.includes(domain))

  if (!site) throw new Error(`Jira site not found for domain: ${domain}`)

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

  // POST /search/jql es el endpoint vigente (GET /search retorna 410 Gone)
  const res = await fetch(`${base}/search/jql`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      jql,
      fields: FIELDS.split(','),
      maxResults,
    }),
  })

  if (!res.ok) throw new Error(`Jira search failed: ${res.status}`)

  const data = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data.issues ?? []) as any[]).map(mapIssue)
}
