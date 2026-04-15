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
