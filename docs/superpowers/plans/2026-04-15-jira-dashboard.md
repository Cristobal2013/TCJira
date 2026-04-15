# TCJira Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js web dashboard that se conecta a Jira Cloud via OAuth Atlassian y muestra métricas Kanban por persona del proyecto PSTC (board 841).

**Architecture:** Next.js App Router con NextAuth v5 para OAuth Atlassian. API routes actúan como proxy seguro hacia Jira Cloud REST API v3, usando el cloudId del tenant. El frontend consume las API routes con SWR para auto-refresh cada 10 minutos.

**Tech Stack:** Next.js 15, NextAuth v5 (Auth.js), Tailwind CSS, shadcn/ui, Recharts, SWR, TypeScript, Jest + Testing Library

---

## File Structure

```
TCJira/
├── app/
│   ├── layout.tsx                          # Root layout con SessionProvider
│   ├── page.tsx                            # Redirect → /dashboard o /login
│   ├── login/
│   │   └── page.tsx                        # Botón login con Atlassian
│   ├── dashboard/
│   │   ├── page.tsx                        # Vista principal del equipo
│   │   └── [member]/
│   │       └── page.tsx                    # Detalle de un miembro
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts                # NextAuth handler
│       └── jira/
│           ├── issues/
│           │   └── route.ts                # GET /api/jira/issues
│           └── members/
│               └── route.ts                # GET /api/jira/members
├── lib/
│   ├── auth.ts                             # NextAuth config (providers, callbacks)
│   ├── jira.ts                             # Jira API client (fetch hacia Atlassian)
│   └── metrics.ts                          # Cálculo de métricas (funciones puras)
├── components/
│   ├── dashboard/
│   │   ├── FilterPanel.tsx                 # Filtros: fechas, tipo, estado
│   │   ├── TeamSummaryCards.tsx            # Cards: abiertos / en progreso / cerrados
│   │   ├── MemberList.tsx                  # Lista de miembros con contadores
│   │   └── TypeDistributionChart.tsx       # Gráfico de barras por tipo
│   └── member/
│       ├── IssueTable.tsx                  # Tabla de tickets del miembro
│       └── ResolutionChart.tsx             # Gráfico distribución por tipo
├── types/
│   └── jira.ts                             # Tipos TypeScript para Jira
├── __tests__/
│   └── lib/
│       ├── metrics.test.ts
│       └── jira.test.ts
├── .env.local.example
├── jest.config.ts
└── next.config.ts
```

---

## Task 1: Scaffolding del proyecto Next.js

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`
- Create: `jest.config.ts`, `jest.setup.ts`
- Create: `.env.local.example`

- [ ] **Step 1: Inicializar Next.js en el directorio del repo**

```bash
cd C:/Users/Cristobal.Zamorano/Desktop/TCJira
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```

Responder "Yes" a todas las preguntas por defecto si las hay.

- [ ] **Step 2: Instalar dependencias de la app**

```bash
npm install next-auth@beta swr recharts
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom ts-jest @types/jest
```

- [ ] **Step 3: Instalar shadcn/ui**

```bash
npx shadcn@latest init -d
npx shadcn@latest add card badge button table select
```

- [ ] **Step 4: Crear jest.config.ts**

```typescript
// jest.config.ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
}

export default createJestConfig(config)
```

- [ ] **Step 5: Crear jest.setup.ts**

```typescript
// jest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Crear .env.local.example**

```env
# .env.local.example
# Obtener desde: https://developer.atlassian.com/console/myapps/
ATLASSIAN_CLIENT_ID=your_client_id_here
ATLASSIAN_CLIENT_SECRET=your_client_secret_here

# Generar con: openssl rand -base64 32
NEXTAUTH_SECRET=your_random_secret_here
NEXTAUTH_URL=http://localhost:3000

# Datos del proyecto Jira
JIRA_PROJECT_KEY=PSTC
JIRA_DOMAIN=sovos.atlassian.net
```

- [ ] **Step 7: Agregar script de test en package.json**

Abrir `package.json` y agregar dentro de `"scripts"`:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: scaffold Next.js project with dependencies"
```

---

## Task 2: Tipos TypeScript para Jira

**Files:**
- Create: `types/jira.ts`

- [ ] **Step 1: Crear types/jira.ts**

```typescript
// types/jira.ts

export type IssueStatus = 'To Do' | 'In Progress' | 'Done'
export type IssueType = 'Bug' | 'Task' | 'Story' | string

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
  assignee: JiraUser
  created: string        // ISO 8601
  resolutionDate: string | null  // ISO 8601 o null si no resuelto
}

export interface MemberMetrics {
  member: JiraUser
  open: number           // status = "To Do"
  inProgress: number     // status = "In Progress"
  closed: number         // status = "Done" con resolutionDate
  avgResolutionDays: number | null   // null si no hay tickets cerrados
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
  issueType?: string     // 'Bug' | 'Task' | 'Story' | '' (todos)
  status?: string        // 'To Do' | 'In Progress' | 'Done' | '' (todos)
}
```

- [ ] **Step 2: Commit**

```bash
git add types/jira.ts
git commit -m "feat: add Jira TypeScript types"
```

---

## Task 3: Métricas — TDD

**Files:**
- Create: `lib/metrics.ts`
- Create: `__tests__/lib/metrics.test.ts`

- [ ] **Step 1: Crear directorio de tests**

```bash
mkdir -p __tests__/lib
```

- [ ] **Step 2: Escribir tests que fallan**

```typescript
// __tests__/lib/metrics.test.ts
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
```

- [ ] **Step 3: Correr tests y verificar que fallan**

```bash
npm test -- __tests__/lib/metrics.test.ts
```

Esperado: FAIL — "Cannot find module '@/lib/metrics'"

- [ ] **Step 4: Implementar lib/metrics.ts**

```typescript
// lib/metrics.ts
import type { JiraIssue, JiraUser, MemberMetrics, TeamMetrics, IssueFilters } from '@/types/jira'

export function calculateMemberMetrics(member: JiraUser, issues: JiraIssue[]): MemberMetrics {
  const open = issues.filter(i => i.status === 'To Do').length
  const inProgress = issues.filter(i => i.status === 'In Progress').length
  const closed = issues.filter(i => i.status === 'Done' && i.resolutionDate !== null)

  const avgResolutionDays = closed.length === 0
    ? null
    : closed.reduce((sum, issue) => {
        const created = new Date(issue.created).getTime()
        const resolved = new Date(issue.resolutionDate!).getTime()
        return sum + (resolved - created) / (1000 * 60 * 60 * 24)
      }, 0) / closed.length

  const byType: Record<string, number> = {}
  for (const issue of issues) {
    byType[issue.issueType] = (byType[issue.issueType] ?? 0) + 1
  }

  return {
    member,
    open,
    inProgress,
    closed: closed.length,
    avgResolutionDays: avgResolutionDays !== null ? Math.round(avgResolutionDays * 10) / 10 : null,
    byType,
  }
}

export function calculateTeamMetrics(issues: JiraIssue[]): TeamMetrics {
  // Agrupar issues por assignee
  const byMember = new Map<string, { user: JiraUser; issues: JiraIssue[] }>()
  for (const issue of issues) {
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
```

- [ ] **Step 5: Correr tests y verificar que pasan**

```bash
npm test -- __tests__/lib/metrics.test.ts
```

Esperado: PASS — todos los tests en verde.

- [ ] **Step 6: Commit**

```bash
git add lib/metrics.ts __tests__/lib/metrics.test.ts
git commit -m "feat: add metrics calculation with tests"
```

---

## Task 4: Jira API Client

**Files:**
- Create: `lib/jira.ts`
- Create: `__tests__/lib/jira.test.ts`

- [ ] **Step 1: Escribir tests que fallan**

```typescript
// __tests__/lib/jira.test.ts
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
    expect(result.assignee.accountId).toBe('abc123')
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
})

describe('getCloudId', () => {
  it('returns the cloudId for the configured domain', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'other-id', url: 'https://other.atlassian.net' },
        { id: MOCK_CLOUD_ID, url: `https://${process.env.JIRA_DOMAIN}` },
      ],
    }) as jest.Mock

    const cloudId = await getCloudId(MOCK_TOKEN)
    expect(cloudId).toBe(MOCK_CLOUD_ID)
  })

  it('throws when domain not found in accessible resources', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'other-id', url: 'https://other.atlassian.net' }],
    }) as jest.Mock

    await expect(getCloudId(MOCK_TOKEN)).rejects.toThrow('Jira site not found')
  })
})
```

- [ ] **Step 2: Correr tests y verificar que fallan**

```bash
npm test -- __tests__/lib/jira.test.ts
```

Esperado: FAIL — "Cannot find module '@/lib/jira'"

- [ ] **Step 3: Implementar lib/jira.ts**

```typescript
// lib/jira.ts
import type { JiraIssue } from '@/types/jira'

const JIRA_DOMAIN = process.env.JIRA_DOMAIN!
const FIELDS = 'summary,status,issuetype,assignee,created,resolutiondate'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapIssue(raw: any): JiraIssue {
  const { fields } = raw
  return {
    id: raw.id,
    key: raw.key,
    summary: fields.summary,
    status: fields.status.name,
    issueType: fields.issuetype.name,
    assignee: {
      accountId: fields.assignee.accountId,
      displayName: fields.assignee.displayName,
      avatarUrl: fields.assignee.avatarUrls?.['48x48'] ?? '',
      emailAddress: fields.assignee.emailAddress,
    },
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
```

- [ ] **Step 4: Correr tests y verificar que pasan**

```bash
npm test -- __tests__/lib/jira.test.ts
```

Esperado: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/jira.ts __tests__/lib/jira.test.ts
git commit -m "feat: add Jira API client with tests"
```

---

## Task 5: NextAuth — Configuración OAuth Atlassian

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Modify: `types/next-auth.d.ts` (extender tipos de sesión)

- [ ] **Step 1: Extender tipos de NextAuth**

```typescript
// types/next-auth.d.ts
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    accessToken: string
    error?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken: string
    refreshToken?: string
    expiresAt?: number
    error?: string
  }
}
```

- [ ] **Step 2: Crear lib/auth.ts**

```typescript
// lib/auth.ts
import NextAuth from 'next-auth'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    {
      id: 'atlassian',
      name: 'Atlassian',
      type: 'oauth',
      authorization: {
        url: 'https://auth.atlassian.com/authorize',
        params: {
          audience: 'api.atlassian.com',
          scope: 'read:jira-work read:jira-user offline_access',
          prompt: 'consent',
        },
      },
      token: 'https://auth.atlassian.com/oauth/token',
      userinfo: 'https://api.atlassian.com/me',
      clientId: process.env.ATLASSIAN_CLIENT_ID,
      clientSecret: process.env.ATLASSIAN_CLIENT_SECRET,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      profile(profile: any) {
        return {
          id: profile.account_id,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        }
      },
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token as string
        token.refreshToken = account.refresh_token as string | undefined
        token.expiresAt = account.expires_at as number | undefined
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      if (token.error) session.error = token.error
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
```

- [ ] **Step 3: Crear app/api/auth/[...nextauth]/route.ts**

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 4: Modificar app/layout.tsx para SessionProvider**

Reemplazar el contenido de `app/layout.tsx` con:

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { SessionProvider } from 'next-auth/react'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TCJira Dashboard',
  description: 'Jira team metrics dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={geist.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Crear .env.local copiando el ejemplo**

```bash
cp .env.local.example .env.local
```

Luego editar `.env.local` con las credenciales reales:
- `ATLASSIAN_CLIENT_ID` y `ATLASSIAN_CLIENT_SECRET` → desde https://developer.atlassian.com/console/myapps/
- `NEXTAUTH_SECRET` → ejecutar `openssl rand -base64 32` y pegar el resultado

**Configuración en Atlassian Developer Console:**
1. Crear app en https://developer.atlassian.com/console/myapps/
2. Tipo: OAuth 2.0 (3LO)
3. Callback URL: `http://localhost:3000/api/auth/callback/atlassian`
4. Scopes: `read:jira-work`, `read:jira-user`, `offline_access`

- [ ] **Step 6: Commit**

```bash
git add lib/auth.ts app/api/auth types/next-auth.d.ts app/layout.tsx
git commit -m "feat: configure NextAuth OAuth Atlassian"
```

---

## Task 6: API Routes — Issues y Members

**Files:**
- Create: `app/api/jira/issues/route.ts`
- Create: `app/api/jira/members/route.ts`

- [ ] **Step 1: Crear app/api/jira/issues/route.ts**

```typescript
// app/api/jira/issues/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { searchIssues } from '@/lib/jira'
import { buildJql } from '@/lib/metrics'
import type { IssueFilters } from '@/types/jira'

const PROJECT_KEY = process.env.JIRA_PROJECT_KEY!

// Cache en memoria: { key: string → { data, expiresAt } }
const cache = new Map<string, { data: unknown; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos

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

  const jql = buildJql(PROJECT_KEY, filters)
  const issues = await searchIssues(session.accessToken, jql)

  cache.set(cacheKey, { data: issues, expiresAt: Date.now() + CACHE_TTL_MS })

  return NextResponse.json(issues)
}
```

- [ ] **Step 2: Crear app/api/jira/members/route.ts**

```typescript
// app/api/jira/members/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { searchIssues } from '@/lib/jira'
import { buildJql } from '@/lib/metrics'
import type { JiraUser } from '@/types/jira'

const PROJECT_KEY = process.env.JIRA_PROJECT_KEY!

export async function GET() {
  const session = await auth()
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Obtener todos los issues para extraer assignees únicos
  const jql = buildJql(PROJECT_KEY, {})
  const issues = await searchIssues(session.accessToken, jql)

  const seen = new Set<string>()
  const members: JiraUser[] = []
  for (const issue of issues) {
    if (!seen.has(issue.assignee.accountId)) {
      seen.add(issue.assignee.accountId)
      members.push(issue.assignee)
    }
  }

  return NextResponse.json(members)
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/jira/
git commit -m "feat: add Jira API proxy routes with in-memory cache"
```

---

## Task 7: Componente FilterPanel

**Files:**
- Create: `components/dashboard/FilterPanel.tsx`

- [ ] **Step 1: Crear components/dashboard/FilterPanel.tsx**

```tsx
// components/dashboard/FilterPanel.tsx
'use client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { IssueFilters } from '@/types/jira'

interface FilterPanelProps {
  filters: IssueFilters
  onChange: (filters: IssueFilters) => void
  onRefresh: () => void
  isLoading: boolean
}

const ISSUE_TYPES = ['', 'Bug', 'Task', 'Story']
const STATUSES = ['', 'To Do', 'In Progress', 'Done']
const DATE_RANGES = [
  { label: 'Todo', value: '' },
  { label: 'Última semana', value: '7d' },
  { label: 'Último mes', value: '30d' },
  { label: 'Últimos 3 meses', value: '90d' },
]

function getDateFrom(range: string): string | undefined {
  if (!range) return undefined
  const days = parseInt(range)
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

export function FilterPanel({ filters, onChange, onRefresh, isLoading }: FilterPanelProps) {
  return (
    <aside className="w-56 shrink-0 space-y-4">
      <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Filtros</h2>

      <div className="space-y-2">
        <label className="text-sm font-medium">Período</label>
        <Select
          value={filters.dateFrom ? '7d' : ''}
          onValueChange={val => onChange({ ...filters, dateFrom: getDateFrom(val) })}
        >
          <SelectTrigger><SelectValue placeholder="Todo" /></SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map(r => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Tipo</label>
        <Select
          value={filters.issueType ?? ''}
          onValueChange={val => onChange({ ...filters, issueType: val || undefined })}
        >
          <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            {ISSUE_TYPES.map(t => (
              <SelectItem key={t} value={t}>{t || 'Todos'}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Estado</label>
        <Select
          value={filters.status ?? ''}
          onValueChange={val => onChange({ ...filters, status: val || undefined })}
        >
          <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>{s || 'Todos'}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={onRefresh} disabled={isLoading} className="w-full">
        {isLoading ? 'Actualizando...' : 'Actualizar'}
      </Button>
    </aside>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/FilterPanel.tsx
git commit -m "feat: add FilterPanel component"
```

---

## Task 8: Componentes de Dashboard — Cards, Lista y Gráfico

**Files:**
- Create: `components/dashboard/TeamSummaryCards.tsx`
- Create: `components/dashboard/MemberList.tsx`
- Create: `components/dashboard/TypeDistributionChart.tsx`

- [ ] **Step 1: Crear TeamSummaryCards.tsx**

```tsx
// components/dashboard/TeamSummaryCards.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TeamMetrics } from '@/types/jira'

interface Props {
  metrics: TeamMetrics
}

export function TeamSummaryCards({ metrics }: Props) {
  const cards = [
    { title: 'Abiertos', value: metrics.totalOpen, color: 'text-yellow-600' },
    { title: 'En Progreso', value: metrics.totalInProgress, color: 'text-blue-600' },
    { title: 'Cerrados', value: metrics.totalClosed, color: 'text-green-600' },
  ]

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map(c => (
        <Card key={c.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Crear MemberList.tsx**

```tsx
// components/dashboard/MemberList.tsx
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { MemberMetrics } from '@/types/jira'

interface Props {
  members: MemberMetrics[]
}

export function MemberList({ members }: Props) {
  return (
    <div className="space-y-2">
      <h2 className="font-semibold text-lg">Por persona</h2>
      <div className="divide-y rounded-lg border">
        {members.map(m => (
          <Link
            key={m.member.accountId}
            href={`/dashboard/${m.member.accountId}`}
            className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={m.member.avatarUrl}
              alt={m.member.displayName}
              className="w-8 h-8 rounded-full"
            />
            <span className="flex-1 font-medium">{m.member.displayName}</span>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                {m.open} abiertos
              </Badge>
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                {m.inProgress} en progreso
              </Badge>
              <Badge variant="outline" className="text-green-600 border-green-300">
                {m.closed} cerrados
              </Badge>
            </div>
            {m.avgResolutionDays !== null && (
              <span className="text-sm text-muted-foreground">
                ~{m.avgResolutionDays}d resolución
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Crear TypeDistributionChart.tsx**

```tsx
// components/dashboard/TypeDistributionChart.tsx
'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  byType: Record<string, number>
}

export function TypeDistributionChart({ byType }: Props) {
  const data = Object.entries(byType).map(([name, count]) => ({ name, count }))

  if (data.length === 0) return null

  return (
    <div>
      <h2 className="font-semibold text-lg mb-4">Tickets por tipo</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/
git commit -m "feat: add dashboard components (cards, member list, chart)"
```

---

## Task 9: Página principal del Dashboard

**Files:**
- Modify: `app/dashboard/page.tsx`
- Create: `app/dashboard/layout.tsx`

- [ ] **Step 1: Crear app/dashboard/layout.tsx**

```tsx
// app/dashboard/layout.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <h1 className="font-bold text-xl">PSTC Dashboard</h1>
        <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }) }}>
          <Button variant="ghost" type="submit">{session.user?.name} · Salir</Button>
        </form>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Crear app/dashboard/page.tsx**

```tsx
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

const REFRESH_INTERVAL_MS = 10 * 60 * 1000 // 10 minutos

function buildUrl(filters: IssueFilters, refresh = false) {
  const params = new URLSearchParams()
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) params.set('dateTo', filters.dateTo)
  if (filters.issueType) params.set('issueType', filters.issueType)
  if (filters.status) params.set('status', filters.status)
  if (refresh) params.set('refresh', 'true')
  return `/api/jira/issues?${params.toString()}`
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function DashboardPage() {
  const [filters, setFilters] = useState<IssueFilters>({})
  const [refreshKey, setRefreshKey] = useState(false)

  const url = buildUrl(filters, refreshKey)
  const { data: issues, isLoading } = useSWR<JiraIssue[]>(url, fetcher, {
    refreshInterval: REFRESH_INTERVAL_MS,
    onSuccess: () => setRefreshKey(false),
  })

  const metrics = issues ? calculateTeamMetrics(issues) : null

  return (
    <div className="flex gap-8">
      <FilterPanel
        filters={filters}
        onChange={setFilters}
        onRefresh={() => setRefreshKey(true)}
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
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/
git commit -m "feat: add main dashboard page"
```

---

## Task 10: Componentes y página de detalle de miembro

**Files:**
- Create: `components/member/IssueTable.tsx`
- Create: `components/member/ResolutionChart.tsx`
- Create: `app/dashboard/[member]/page.tsx`

- [ ] **Step 1: Crear IssueTable.tsx**

```tsx
// components/member/IssueTable.tsx
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { JiraIssue } from '@/types/jira'

interface Props {
  issues: JiraIssue[]
}

const STATUS_COLORS: Record<string, string> = {
  'To Do': 'text-yellow-600',
  'In Progress': 'text-blue-600',
  'Done': 'text-green-600',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function IssueTable({ issues }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Clave</TableHead>
          <TableHead>Resumen</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Creado</TableHead>
          <TableHead>Resuelto</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {issues.map(issue => (
          <TableRow key={issue.id}>
            <TableCell className="font-mono text-sm">{issue.key}</TableCell>
            <TableCell className="max-w-xs truncate">{issue.summary}</TableCell>
            <TableCell>
              <Badge variant="outline">{issue.issueType}</Badge>
            </TableCell>
            <TableCell className={STATUS_COLORS[issue.status] ?? ''}>{issue.status}</TableCell>
            <TableCell className="text-sm">{formatDate(issue.created)}</TableCell>
            <TableCell className="text-sm">{formatDate(issue.resolutionDate)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

- [ ] **Step 2: Crear ResolutionChart.tsx**

```tsx
// components/member/ResolutionChart.tsx
'use client'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444']

interface Props {
  byType: Record<string, number>
}

export function ResolutionChart({ byType }: Props) {
  const data = Object.entries(byType).map(([name, value]) => ({ name, value }))
  if (data.length === 0) return null

  return (
    <div>
      <h2 className="font-semibold text-lg mb-4">Distribución por tipo</h2>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 3: Crear app/dashboard/[member]/page.tsx**

```tsx
// app/dashboard/[member]/page.tsx
'use client'
import useSWR from 'swr'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { IssueTable } from '@/components/member/IssueTable'
import { ResolutionChart } from '@/components/member/ResolutionChart'
import { calculateMemberMetrics } from '@/lib/metrics'
import type { JiraIssue } from '@/types/jira'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function MemberPage({ params }: { params: { member: string } }) {
  const { data: allIssues, isLoading } = useSWR<JiraIssue[]>('/api/jira/issues', fetcher)

  const memberIssues = allIssues?.filter(i => i.assignee.accountId === params.member) ?? []
  const firstIssue = memberIssues[0]
  const member = firstIssue?.assignee

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
```

- [ ] **Step 4: Commit**

```bash
git add components/member/ app/dashboard/
git commit -m "feat: add member detail page with issue table and chart"
```

---

## Task 11: Login y redirect raíz

**Files:**
- Modify: `app/page.tsx`
- Create: `app/login/page.tsx`

- [ ] **Step 1: Crear app/login/page.tsx**

```tsx
// app/login/page.tsx
import { signIn } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="w-96">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">TCJira Dashboard</CardTitle>
          <CardDescription>
            Métricas del equipo del proyecto PSTC
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={async () => {
            'use server'
            await signIn('atlassian', { redirectTo: '/dashboard' })
          }}>
            <Button type="submit" className="w-full">
              Conectar con Atlassian
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Modificar app/page.tsx**

```tsx
// app/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const session = await auth()
  redirect(session ? '/dashboard' : '/login')
}
```

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx app/login/
git commit -m "feat: add login page and root redirect"
```

---

## Task 12: Verificación final y push

- [ ] **Step 1: Correr todos los tests**

```bash
npm test
```

Esperado: PASS en todos los tests de metrics y jira.

- [ ] **Step 2: Verificar que la app compila sin errores**

```bash
npm run build
```

Esperado: Build exitoso sin errores de TypeScript.

- [ ] **Step 3: Levantar la app en desarrollo**

```bash
npm run dev
```

Abrir http://localhost:3000 y verificar:
- [ ] Redirige a `/login`
- [ ] Botón "Conectar con Atlassian" visible
- [ ] Después del login OAuth, redirige a `/dashboard`
- [ ] Dashboard muestra cards de resumen, lista de miembros y gráfico
- [ ] Filtros funcionan al cambiar y hacen nueva petición
- [ ] Botón "Actualizar" fuerza refresh
- [ ] Click en un miembro lleva a `/dashboard/[accountId]` con tabla y gráfico

- [ ] **Step 4: Push al repositorio**

```bash
git push origin main
```

---

## Notas importantes

### Configuración OAuth en Atlassian Developer Console
1. Ir a https://developer.atlassian.com/console/myapps/
2. Crear app → OAuth 2.0 (3LO)
3. Agregar Callback URL: `http://localhost:3000/api/auth/callback/atlassian`
4. Habilitar scopes: `read:jira-work`, `read:jira-user`, `offline_access`
5. Copiar Client ID y Client Secret al `.env.local`

### Para producción (Vercel)
- Agregar las variables de entorno en el panel de Vercel
- Actualizar `NEXTAUTH_URL` con la URL de producción
- Agregar la URL de producción como Callback URL en Atlassian Developer Console

### Roadmap v2 — Notificaciones por email
Cuando se implemente: agregar un endpoint `/api/jira/alerts` que busque tickets con `status != Done AND created <= "N días atrás"` y envíe emails via Resend SDK (`npm install resend`).