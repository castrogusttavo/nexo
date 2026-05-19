import 'server-only'
import type { CreateEmailOptions, CreateEmailResponseSuccess } from 'resend'
import { logger } from '@/lib/axiom/logger'
import { defaultFrom, resend } from '@/src/lib/mail/client'
import { consume, emailLimiter } from '@/src/lib/rate-limit'

export type SendEmailParams = Omit<CreateEmailOptions, 'from'> & {
  from?: string
}

function primaryRecipient(to: CreateEmailOptions['to']): string | null {
  const list = Array.isArray(to) ? to : [to]
  const first = list[0]
  if (!first) return null
  return first.toString().trim().toLowerCase() || null
}

export async function sendEmail(
  params: SendEmailParams,
): Promise<CreateEmailResponseSuccess> {
  const recipient = primaryRecipient(params.to)
  if (!recipient) {
    throw new Error('sendEmail: missing recipient')
  }

  const guard = await consume(emailLimiter, recipient)
  if (!guard.ok) {
    const seconds =
      (guard.error.details as { retryAfterSeconds?: number } | undefined)
        ?.retryAfterSeconds ?? 0
    logger.warn('email_rate_limited', {
      recipient,
      retryAfterSeconds: seconds,
    })
    throw new Error(
      `Email rate limited for ${recipient}. Retry after ${seconds}s.`,
    )
  }

  const { data, error } = await resend.emails.send({
    from: params.from ?? defaultFrom,
    ...params,
  } as CreateEmailOptions)

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to send email')
  }
  return data
}
