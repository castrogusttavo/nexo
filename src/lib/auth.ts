import { createId } from '@paralleldrive/cuid2'
import { hash, verify } from 'argon2'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { Resend } from 'resend'
import { WelcomeEmail } from '@/components/emails/user/welcome'
import {
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  RESEND_API_KEY,
} from '@/lib/env/server'
import { prisma } from './prisma'

const getResend = () => new Resend(RESEND_API_KEY)

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  advanced: {
    database: {
      generateId: () => createId(),
    },
  },
  baseURL: BETTER_AUTH_URL,
  trustedOrigins: [BETTER_AUTH_URL],
  secret: BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password) => hash(password),
      verify: async ({ hash: hashed, password }) => verify(hashed, password),
    },
  },
  socialProviders: {
    google: {
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
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
          try {
            await getResend().emails.send({
              from: 'nexo <suporte@nexo.coodee.dev>',
              to: [user.email],
              subject: 'Welcome Nexo',
              react: WelcomeEmail({ userFirstname: user.name ?? 'there' }),
            })
          } catch (error) {
            console.error('[Auth] Failed to send welcome email:', error)
          }
        },
      },
    },
  },
})
