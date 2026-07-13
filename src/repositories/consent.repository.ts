import type { ConsentAction } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'
import { dbError } from './db-error'

export const ConsentRepository = {
  async findLatestCookieConsentAction(
    userId: string,
  ): Promise<Result<ConsentAction | null>> {
    try {
      const latest = await prisma.consentEvent.findFirst({
        where: { userId, document: 'COOKIES' },
        orderBy: { createdAt: 'desc' },
        select: { action: true },
      })
      return ok(latest?.action ?? null)
    } catch (error) {
      return err(dbError('Failed to find latest cookie consent', error))
    }
  },

  async recordCookieConsent(data: {
    userId: string
    version: string
    action: ConsentAction
    ipAddress: string | null
    userAgent: string | null
  }): Promise<Result<void>> {
    try {
      await prisma.consentEvent.create({
        data: {
          userId: data.userId,
          document: 'COOKIES',
          version: data.version,
          action: data.action,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      })
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to record cookie consent', error))
    }
  },
}
