import { getCloudId, searchIssues, mapIssue } from '@/lib/jira'

const MOCK_TOKEN = 'mock-access-token'
const MOCK_CLOUD_ID = 'mock-cloud-id'

describe('mapIssue', () => {
  it('maps a raw Jira API issue to JiraIssue type', () => {
    const raw = {
      id: '10001',
      key: 'PSTC-1',
      fields: {
        summary: 'Test issue',
        status: { name: 'In Progress' },
        issuetype: { name: 'Bug' },
        assignee: {
          accountId: 'abc123',
          displayName: 'Juan',
          avatarUrls: { '48x48': 'https://example.com/avatar.png' },
          emailAddress: 'juan@example.com',
        },
        created: '2026-04-01T00:00:00.000Z',
        resolutiondate: '2026-04-06T00:00:00.000Z',
      },
    }
    const result = mapIssue(raw)
    expect(result.id).toBe('10001')
    expect(result.key).toBe('PSTC-1')
    expect(result.status).toBe('In Progress')
    expect(result.issueType).toBe('Bug')
    expect(result.assignee).not.toBeNull()
    expect(result.assignee!.accountId).toBe('abc123')
    expect(result.resolutionDate).toBe('2026-04-06T00:00:00.000Z')
  })

  it('sets resolutionDate to null when not resolved', () => {
    const raw = {
      id: '10002',
      key: 'PSTC-2',
      fields: {
        summary: 'Open issue',
        status: { name: 'To Do' },
        issuetype: { name: 'Task' },
        assignee: {
          accountId: 'abc123',
          displayName: 'Juan',
          avatarUrls: { '48x48': 'https://example.com/avatar.png' },
        },
        created: '2026-04-01T00:00:00.000Z',
        resolutiondate: null,
      },
    }
    const result = mapIssue(raw)
    expect(result.resolutionDate).toBeNull()
  })

  it('sets assignee to null when issue is unassigned', () => {
    const raw = {
      id: '10003',
      key: 'PSTC-3',
      fields: {
        summary: 'Unassigned issue',
        status: { name: 'To Do' },
        issuetype: { name: 'Task' },
        assignee: null,
        created: '2026-04-01T00:00:00.000Z',
        resolutiondate: null,
      },
    }
    const result = mapIssue(raw)
    expect(result.assignee).toBeNull()
  })
})

describe('getCloudId', () => {
  beforeEach(() => {
    // Reset module-level cache between tests
    jest.resetModules()
  })

  it('returns the cloudId for the configured domain', async () => {
    process.env.JIRA_DOMAIN = 'sovos.atlassian.net'
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'other-id', url: 'https://other.atlassian.net' },
        { id: MOCK_CLOUD_ID, url: 'https://sovos.atlassian.net' },
      ],
    }) as jest.Mock

    const { getCloudId } = await import('@/lib/jira')
    const cloudId = await getCloudId(MOCK_TOKEN)
    expect(cloudId).toBe(MOCK_CLOUD_ID)
  })

  it('throws when domain not found in accessible resources', async () => {
    process.env.JIRA_DOMAIN = 'sovos.atlassian.net'
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'other-id', url: 'https://other.atlassian.net' }],
    }) as jest.Mock

    const { getCloudId } = await import('@/lib/jira')
    await expect(getCloudId(MOCK_TOKEN)).rejects.toThrow('Jira site not found')
  })
})
