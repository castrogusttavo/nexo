import { createId } from '@paralleldrive/cuid2'
import { hash, verify } from 'argon2'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { emailOTP, twoFactor } from 'better-auth/plugins'
import { auditAuth } from '@/lib/axiom/audit'
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
import { UserService } from '@/src/services/user.service'
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
      auditAuth({ event: 'user.email_verified', userId: user.id })
      try {
        await sendWelcomeEmail({
          email: user.email,
          username: user.name ?? 'there',
          trialDays: '14',
        })
      } catch (error) {
        auditAuth({
          event: 'auth.welcome_email.send_failed',
          userId: user.id,
          outcome: 'failure',
          reason: error instanceof Error ? error.message : String(error),
        })
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
    // Encrypt OAuth access/refresh/id tokens at rest using better-auth's
    // native XChaCha20-Poly1305 envelope ($ba$<version>$<ct>). Keys come
    // from BETTER_AUTH_SECRETS (versioned, comma-separated "v:secret"
    // pairs); BETTER_AUTH_SECRET stays as the legacy fallback for
    // pre-envelope payloads. Existing plain tokens are read as-is and
    // re-encrypted lazily on the next OAuth refresh/login.
    encryptOAuthTokens: true,
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
          auditAuth({ event: 'user.created', userId: user.id })
          if (!user.emailVerified) return
          try {
            await sendWelcomeEmail({
              email: user.email,
              username: user.name ?? 'there',
              trialDays: '14',
            })
          } catch (error) {
            auditAuth({
              event: 'auth.welcome_email.send_failed',
              userId: user.id,
              outcome: 'failure',
              reason: error instanceof Error ? error.message : String(error),
            })
          }
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          auditAuth({
            event: 'session.created',
            userId: session.userId,
            meta: { sessionId: session.id },
          })

          // Auto-cancel pending account deletion when a user logs back
          // in during the grace period: re-authenticating signals they
          // changed their mind. This is intentional UX, not a bug — but
          // it means manual end-to-end tests of the deletion flow must
          // NOT relog before the worker fires, or the schedule is wiped.
          try {
            const result = await UserService.cancelDeletion(session.userId)
            if (result.ok && result.value.canceled) {
              auditAuth({
                event: 'user.deletion_canceled_on_login',
                userId: session.userId,
                meta: { sessionId: session.id },
              })
            }
          } catch (error) {
            auditAuth({
              event: 'user.deletion_cancel_failed',
              userId: session.userId,
              outcome: 'failure',
              reason: error instanceof Error ? error.message : String(error),
              meta: { sessionId: session.id },
            })
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
        auditAuth({
          event: 'auth.email_otp.requested',
          meta: { otpType: type },
        })
        try {
          await sendVerifyEmailWithOtp({
            email,
            validationCode: otp,
          })
        } catch (error) {
          auditAuth({
            event: 'auth.email_otp.send_failed',
            outcome: 'failure',
            reason: error instanceof Error ? error.message : String(error),
            meta: { otpType: type },
          })
        }
      },
    }),
    twoFactor({
      otpOptions: {
        period: 5,
        async sendOTP({ user, otp }) {
          try {
            await sendVerify2faAccessOtp({
              email: user.email,
              username: user.name ?? undefined,
              validationCode: otp,
            })
          } catch (error) {
            auditAuth({
              event: 'auth.2fa_otp.send_failed',
              userId: user.id,
              outcome: 'failure',
              reason: error instanceof Error ? error.message : String(error),
            })
          }
        },
      },
    }),
  ],
})
