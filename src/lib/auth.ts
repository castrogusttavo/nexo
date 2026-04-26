import { createId } from '@paralleldrive/cuid2'
import { hash, verify } from 'argon2'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { emailOTP, twoFactor } from 'better-auth/plugins'
import {
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} from '@/lib/env/server'
import { sendVerify2faAccessOtp } from '@/src/lib/mail/user/send-verify-2fa-access-otp'
import { sendVerifyEmailWithOtp } from '@/src/lib/mail/user/send-verify-email-with-otp'
import { sendWelcomeEmail } from '@/src/lib/mail/user/send-welcome'
import { prisma } from './prisma'

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
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    afterEmailVerification: async (user) => {
      try {
        await sendWelcomeEmail({
          email: user.email,
          username: user.name ?? 'there',
          trialDays: '14',
        })
      } catch (error) {
        console.error('[Auth] Failed to send welcome email:', error)
      }
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
          if (!user.emailVerified) return
          try {
            await sendWelcomeEmail({
              email: user.email,
              username: user.name ?? 'there',
              trialDays: '14',
            })
          } catch (error) {
            console.error('[Auth] Failed to send welcome email:', error)
          }
        },
      },
    },
  },
  plugins: [
    emailOTP({
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== 'email-verification' && type !== 'sign-in') return
        try {
          await sendVerifyEmailWithOtp({
            email,
            validationCode: otp,
          })
        } catch (error) {
          console.error('[Auth] Failed to send verification OTP:', error)
        }
      },
    }),
    twoFactor({
      otpOptions: {
        async sendOTP({ user, otp }) {
          try {
            await sendVerify2faAccessOtp({
              email: user.email,
              username: user.name ?? undefined,
              validationCode: otp,
            })
          } catch (error) {
            console.error('[Auth] Failed to send 2FA OTP:', error)
          }
        },
      },
    }),
  ],
})
