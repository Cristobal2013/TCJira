// app/api/jira/members/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { searchIssues } from '@/lib/jira'
import { buildJql } from '@/lib/metrics'
import type { JiraUser } from '@/types/jira'

const PROJECT_KEY = process.env.JIRA_PROJECT_KEY!

let membersCache: { data: JiraUser[]; expiresAt: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function GET() {
  const session = await auth()
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (membersCache && membersCache.expiresAt > Date.now()) {
    return NextResponse.json(membersCache.data)
  }

  try {
    const jql = buildJql(PROJECT_KEY, {})
    const issues = await searchIssues(session.accessToken, jql)

    const seen = new Set<string>()
    const members: JiraUser[] = []
    for (const issue of issues) {
      if (!issue.assignee) continue
      if (!seen.has(issue.assignee.accountId)) {
        seen.add(issue.assignee.accountId)
        members.push(issue.assignee)
      }
    }

    membersCache = { data: members, expiresAt: Date.now() + CACHE_TTL_MS }
    return NextResponse.json(members)
  } catch (error) {
    console.error('Jira members fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch members from Jira' }, { status: 502 })
  }
}
