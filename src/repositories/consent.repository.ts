import type { ConsentAction } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'
import { dbError } from './db-error'

export const ConsentRepository = {
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
