import { createId } from '@paralleldrive/cuid2'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { Resend } from 'resend'
import { WelcomeEmail } from '@/components/emails/welcome'
import { prisma } from './prisma'

const getResend = () => new Resend(process.env.RESEND_API_KEY)

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  advanced: {
    database: {
      generateId: () => createId(),
    },
  },
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    },
  },
  account: {
    accountLinking: { enabled: true },
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'MEMBER', input: false },
      workspaceId: { type: 'string', required: false, input: false },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await getResend().emails.send({
            from: 'stratustelecom <suporte@stratustelecom.com.br>',
            to: [user.email],
            subject: 'Hello world',
            react: WelcomeEmail({ userFirstname: user.name ?? 'there' }),
          })
        },
      },
    },
  },
})
