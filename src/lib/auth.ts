import { createId } from '@paralleldrive/cuid2'
import { hash, verify } from 'argon2'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { emailOTP, twoFactor } from 'better-auth/plugins'
import { auditAuth, auditMutation } from '@/lib/axiom/audit'
import { NODE_ENV } from '@/lib/env/env'
import {
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} from '@/lib/env/server'
import { PRIVACY_VERSION, TERMS_VERSION } from '@/lib/legal/versions'
import { sendResetPasswordEmail } from '@/src/lib/mail/user/send-reset-password'
import { sendVerify2faAccessOtp } from '@/src/lib/mail/user/send-verify-2fa-access-otp'
import { sendVerifyEmailWithOtp } from '@/src/lib/mail/user/send-verify-email-with-otp'
import { sendWelcomeEmail } from '@/src/lib/mail/user/send-welcome'
import { UserService } from '@/src/services/user.service'
import { prisma } from './prisma'
import { generateUniqueUsername } from './username'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  advanced: {
    database: {
      generateId: () => createId(),
    },
  },
  // O app já aplica rate limit próprio (Redis) nas rotas de auth via route.ts.
  // O limiter embutido do better-auth (em memória, ativo só em produção) é
  // redundante e, no e2e — que roda `next start` em modo produção — bloqueia os
  // sign-ups da suíte inteira a partir do mesmo IP. Preserva o default em
  // produção real e desliga apenas quando o e2e seta o flag.
  rateLimit: {
    enabled:
      process.env.DISABLE_AUTH_RATE_LIMIT === 'true'
        ? false
        : NODE_ENV === 'production',
  },
  baseURL: BETTER_AUTH_URL,
  trustedOrigins: [BETTER_AUTH_URL],
  secret: BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    password: {
      hash: async (password) => hash(password),
      verify: async ({ hash: hashed, password }) => verify(hashed, password),
    },
    // A redefinição de senha costuma ocorrer após comprometimento da conta;
    // derrubar as demais sessões expulsa um eventual atacante.
    revokeSessionsOnPasswordReset: true,
    // `url` is the full reset link better-auth builds for us: it points at
    // the API verification endpoint that validates the token and then
    // redirects to the `redirectTo` page (/reset-password) with `?token=`.
    // Without this callback, POST /auth/request-password-reset is a no-op.
    sendResetPassword: async ({ user, url }) => {
      auditAuth({ event: 'auth.reset_password.requested', userId: user.id })
      try {
        await sendResetPasswordEmail({
          email: user.email,
          username: user.name ?? undefined,
          redirectUrl: url,
        })
      } catch (error) {
        auditAuth({
          event: 'auth.reset_password.send_failed',
          userId: user.id,
          outcome: 'failure',
          reason: error instanceof Error ? error.message : String(error),
        })
      }
    },
    onPasswordReset: async ({ user }) => {
      auditAuth({ event: 'auth.reset_password.completed', userId: user.id })
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
  user: {
    additionalFields: {
      // Accepted at the email/password signup form (Onda 3). Declared
      // here so better-auth's parseUserInput on POST /sign-up/email
      // accepts the fields and persists them; OAuth flows skip
      // parseUserInput entirely, so these stay null for social
      // signups until the consent gate (Onda 4) collects them.
      username: { type: 'string', input: false, required: false },
      acceptedTermsAt: { type: 'date', input: true, required: false },
      acceptedPrivacyAt: { type: 'date', input: true, required: false },
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
        before: async (data) => {
          // Derive a unique username from the email local-part. Runs for
          // every signup path (email/password + OAuth), so the column is
          // always populated before insert (it's NOT NULL @unique)
          const username = await generateUniqueUsername(
            data.email,
            async (u) =>
              (await prisma.user.count({ where: { username: u } })) > 0,
          )

          // Trust the server clock, not the client. The signup form
          // sends `new Date()` for each accepted document; we replace
          // those with the server's `now` so a tampered client can't
          // backdate (or postdate) its acceptance.
          const now = new Date()
          return {
            data: {
              ...data,
              username,
              ...(data.acceptedTermsAt ? { acceptedTermsAt: now } : {}),
              ...(data.acceptedPrivacyAt ? { acceptedPrivacyAt: now } : {}),
            },
          }
        },
        after: async (user, context) => {
          auditAuth({ event: 'user.created', userId: user.id })

          if (user.acceptedTermsAt || user.acceptedPrivacyAt) {
            const reqHeaders = context?.request?.headers
            const ipAddress =
              reqHeaders?.get('x-forwarded-for')?.split(',')[0]?.trim() ||
              reqHeaders?.get('x-real-ip') ||
              null
            const userAgent = reqHeaders?.get('user-agent') ?? null

            const events: {
              userId: string
              document: 'TERMS' | 'PRIVACY'
              version: string
              action: 'GRANTED'
              ipAddress: string | null
              userAgent: string | null
            }[] = []
            if (user.acceptedTermsAt) {
              events.push({
                userId: user.id,
                document: 'TERMS',
                version: TERMS_VERSION,
                action: 'GRANTED',
                ipAddress,
                userAgent,
              })
            }
            if (user.acceptedPrivacyAt) {
              events.push({
                userId: user.id,
                document: 'PRIVACY',
                version: PRIVACY_VERSION,
                action: 'GRANTED',
                ipAddress,
                userAgent,
              })
            }
            try {
              await prisma.consentEvent.createMany({ data: events })
              auditMutation({
                entity: 'consent',
                action: 'grant',
                actorId: user.id,
                targetId: user.id,
                meta: {
                  documents: events.map((e) => e.document),
                  termsVersion: TERMS_VERSION,
                  privacyVersion: PRIVACY_VERSION,
                },
              })
            } catch (error) {
              // Don't fail the signup if the audit trail write fails;
              // the User.acceptedXxxAt columns still hold the current
              // state. Log loudly so we notice.
              auditMutation({
                entity: 'consent',
                action: 'grant',
                actorId: user.id,
                targetId: user.id,
                outcome: 'failure',
                reason: error instanceof Error ? error.message : String(error),
              })
            }
          }

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
      // O 2º fator é OTP por e-mail (enviado ao e-mail já verificado da
      // conta), não TOTP/authenticator — não há etapa de scan/verify no
      // toggle. Sem isso, `twoFactor.enable()` não persiste `twoFactorEnabled`
      // e a ativação "some" ao recarregar a sessão.
      skipVerificationOnEnable: true,
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
