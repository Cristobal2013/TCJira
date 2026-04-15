// app/dashboard/layout.tsx
import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <h1 className="font-bold text-xl">PSTC Dashboard</h1>
        <form action={async () => {
          'use server'
          await signOut({ redirectTo: '/login' })
        }}>
          <Button variant="ghost" type="submit">{session.user?.name} · Salir</Button>
        </form>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
