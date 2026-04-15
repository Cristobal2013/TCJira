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
                ~{m.avgResolutionDays}d
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
