// app/api/jira/issues/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { searchIssues } from '@/lib/jira'
import { buildJql } from '@/lib/metrics'
import type { IssueFilters } from '@/types/jira'

const PROJECT_KEY = process.env.JIRA_PROJECT_KEY!

// In-memory cache: key → { data, expiresAt }
const cache = new Map<string, { data: unknown; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const filters: IssueFilters = {
    dateFrom: searchParams.get('dateFrom') ?? undefined,
    dateTo: searchParams.get('dateTo') ?? undefined,
    issueType: searchParams.get('issueType') ?? undefined,
    status: searchParams.get('status') ?? undefined,
  }
  const forceRefresh = searchParams.get('refresh') === 'true'

  const cacheKey = JSON.stringify(filters)
  const cached = cache.get(cacheKey)

  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data)
  }

  try {
    const jql = buildJql(PROJECT_KEY, filters)
    const issues = await searchIssues(session.accessToken, jql)
    cache.set(cacheKey, { data: issues, expiresAt: Date.now() + CACHE_TTL_MS })
    return NextResponse.json(issues)
  } catch (error) {
    console.error('Jira issues fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch issues from Jira' }, { status: 502 })
  }
}
