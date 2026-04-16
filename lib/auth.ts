// lib/auth.ts
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NextAuth = require('next-auth').default ?? require('next-auth')

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, account }: { token: any; account: any }) {
      if (account) {
        token.accessToken = account.access_token as string
        token.refreshToken = account.refresh_token as string | undefined
        token.expiresAt = account.expires_at as number | undefined
      }
      return token
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: { session: any; token: any }) {
      session.accessToken = token.accessToken as string
      if (token.error) session.error = token.error as string
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
